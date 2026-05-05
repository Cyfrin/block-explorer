import { Logger } from "@nestjs/common";

const COINGECKO_SIMPLE_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price";
const REQUEST_TIMEOUT_MS = 10_000;

const logger = new Logger("NativePriceProvider");

export async function fetchNativeTokenUsdPrice(coingeckoId = "ethereum"): Promise<number | null> {
  const url = `${COINGECKO_SIMPLE_PRICE_URL}?ids=${coingeckoId}&vs_currencies=usd`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn(`CoinGecko returned ${response.status} for native price`);
      return null;
    }

    const data = (await response.json()) as Record<string, { usd?: number }>;
    const price = data[coingeckoId]?.usd;
    return typeof price === "number" ? price : null;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      logger.warn("CoinGecko native price request timed out");
    } else {
      logger.error(`CoinGecko native price request failed: ${err}`);
    }
    return null;
  }
}
