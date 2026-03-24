import { AbiCoder } from "ethers";

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

export function decodeRevertReason(output: string | null): string | null {
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
    // Decoding failed — fall through to return raw hex
  }

  // Unknown selector or decode failure — return raw hex so it's at least visible
  return output;
}
