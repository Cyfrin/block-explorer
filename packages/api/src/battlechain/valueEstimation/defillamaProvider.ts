import { Logger } from "@nestjs/common";

const DEFILLAMA_PRICES_URL = "https://coins.llama.fi/prices/current";
const REQUEST_TIMEOUT_MS = 10_000;

export interface DefillamaPrice {
  price: number;
  confidence: number;
  decimals: number;
  symbol: string;
}

const logger = new Logger("DefillamaProvider");

/**
 * Batch-fetch token prices from DeFiLlama's coins API.
 * Tokens are identified by `ethereum:{l1Address}` format.
 *
 * @param l1Addresses Map of l1Address → l2Address for reverse lookup
 * @returns Map of l2Address → price data
 */
export async function fetchDefillamaPrices(
  l1ToL2Map: Map<string, string>
): Promise<Map<string, DefillamaPrice>> {
  const result = new Map<string, DefillamaPrice>();

  if (l1ToL2Map.size === 0) return result;

  const coinIds = Array.from(l1ToL2Map.keys()).map((l1) => `ethereum:${l1}`);
  const url = `${DEFILLAMA_PRICES_URL}/${coinIds.join(",")}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn(`DeFiLlama API returned ${response.status}`);
      return result;
    }

    const data = (await response.json()) as {
      coins: Record<
        string,
        {
          price: number;
          confidence: number;
          decimals: number;
          symbol: string;
          timestamp: number;
        }
      >;
    };

    for (const [coinId, priceData] of Object.entries(data.coins)) {
      // coinId is "ethereum:0x..." — extract the l1Address
      const l1Address = coinId.replace("ethereum:", "").toLowerCase();
      const l2Address = l1ToL2Map.get(l1Address);

      if (l2Address && priceData.price != null) {
        result.set(l2Address, {
          price: priceData.price,
          confidence: priceData.confidence ?? 0,
          decimals: priceData.decimals,
          symbol: priceData.symbol,
        });
      }
    }

    logger.log(`DeFiLlama returned prices for ${result.size}/${l1ToL2Map.size} tokens`);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      logger.warn("DeFiLlama request timed out");
    } else {
      logger.error(`DeFiLlama request failed: ${err}`);
    }
  }

  return result;
}
