/**
 * Backfill revert reasons for failed transactions.
 *
 * Finds all failed transactions where revertReason is NULL, calls
 * debug_traceTransaction on each, and updates the DB with the decoded output.
 *
 * Usage:
 *   npx tsx scripts/backfill-revert-reasons.ts
 *
 * Environment variables:
 *   DATABASE_URL  — Postgres connection string (required)
 *   RPC_URL       — JSON-RPC endpoint with debug_traceTransaction support (required)
 *   BATCH_SIZE    — Number of transactions to process per batch (default: 50)
 *   DRY_RUN       — Set to "true" to log without writing to DB
 */

import { AbiCoder, JsonRpcProvider } from "ethers";
import pg from "pg";

const { Pool } = pg;

// --- revert decoding (inlined from data-fetcher) ---

const ERROR_SELECTOR = "0x08c379a0";
const PANIC_SELECTOR = "0x4e487b71";

const PANIC_REASONS: Record<number, string> = {
  0x00: "Generic compiler panic",
  0x01: "Assertion failed",
  0x11: "Arithmetic overflow/underflow",
  0x12: "Division or modulo by zero",
  0x21: "Conversion to invalid type",
  0x22: "Access to invalid storage byte array",
  0x31: "Pop on empty array",
  0x32: "Array out-of-bounds access",
  0x41: "Too much memory allocated",
  0x51: "Called zero-initialized function variable",
};

function decodeRevertReason(output: string | null): string | null {
  if (!output || output === "0x" || output.length < 10) {
    return null;
  }

  const selector = output.slice(0, 10).toLowerCase();
  const data = "0x" + output.slice(10);

  try {
    if (selector === ERROR_SELECTOR) {
      const [reason] = AbiCoder.defaultAbiCoder().decode(["string"], data);
      return reason;
    }

    if (selector === PANIC_SELECTOR) {
      const [code] = AbiCoder.defaultAbiCoder().decode(["uint256"], data);
      const panicCode = Number(code);
      const description = PANIC_REASONS[panicCode] || "Unknown panic code";
      return `Panic(0x${panicCode.toString(16).padStart(2, "0")}): ${description}`;
    }
  } catch {
    // fall through
  }

  return output;
}

// --- main ---

const DATABASE_URL = process.env.DATABASE_URL;
const RPC_URL = process.env.RPC_URL;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "50", 10);
const DRY_RUN = process.env.DRY_RUN === "true";

if (!DATABASE_URL || !RPC_URL) {
  console.error("DATABASE_URL and RPC_URL environment variables are required");
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const provider = new JsonRpcProvider(RPC_URL);

  try {
    // Find all failed transactions with no revert reason
    const { rows } = await pool.query<{ hash: string }>(
      `SELECT '0x' || encode(hash, 'hex') as hash FROM transactions WHERE "receiptStatus" = 0 AND "revertReason" IS NULL ORDER BY "blockNumber" ASC`
    );

    console.log(`Found ${rows.length} failed transactions without revert reasons`);
    if (rows.length === 0) return;

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async ({ hash }) => {
          try {
            const trace = await provider.send("debug_traceTransaction", [
              hash,
              { tracer: "callTracer", tracerConfig: { onlyTopCall: true } },
            ]);

            const revertReason = trace?.revertReason || decodeRevertReason(trace?.output);

            if (!revertReason) {
              skipped++;
              return;
            }

            if (DRY_RUN) {
              console.log(`[DRY RUN] ${hash} → ${revertReason}`);
              updated++;
              return;
            }

            await pool.query(`UPDATE transactions SET "revertReason" = $1 WHERE hash = decode($2, 'hex')`, [
              revertReason,
              hash.slice(2),
            ]);
            updated++;
            console.log(`Updated ${hash} → ${revertReason}`);
          } catch (err) {
            errors++;
            console.error(`Error processing ${hash}:`, (err as Error).message);
          }
        })
      );

      console.log(`Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} (updated: ${updated}, skipped: ${skipped}, errors: ${errors})`);
    }

    console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
