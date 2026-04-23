import { JsonRpcProvider, Contract } from "ethers";
import { DecompositionType, UnderlyingToken, CachedRatio } from "../tokenDecomposition.entity";

export interface DecompositionResult {
  type: DecompositionType;
  underlyingTokens: UnderlyingToken[];
  ratios: CachedRatio[];
}

// Minimal ABI fragments (ethers v6 human-readable format)
const ERC4626_ABI = [
  "function asset() view returns (address)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const UNISWAP_V2_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function totalSupply() view returns (uint256)",
];

const COMPOUND_ABI = [
  "function underlying() view returns (address)",
  "function exchangeRateStored() view returns (uint256)",
];

const AAVE_ABI = ["function UNDERLYING_ASSET_ADDRESS() view returns (address)"];

const ERC20_DECIMALS_ABI = ["function decimals() view returns (uint8)"];

const WRAPPER_ABI = ["function underlying() view returns (address)", "function token() view returns (address)"];

const RPC_CALL_TIMEOUT_MS = 3000;

/**
 * Wraps an ethers contract call with a timeout.
 * Returns null if the call reverts or times out.
 */
async function safeCall<T>(promise: Promise<T>): Promise<T | null> {
  try {
    const result = await Promise.race([
      promise,
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), RPC_CALL_TIMEOUT_MS)),
    ]);
    return result;
  } catch {
    return null;
  }
}

async function getDecimals(address: string, provider: JsonRpcProvider): Promise<number> {
  const contract = new Contract(address, ERC20_DECIMALS_ABI, provider);
  const decimals = await safeCall(contract.decimals());
  return decimals != null ? Number(decimals) : 18;
}

/**
 * Detect ERC4626 vault tokens.
 * Calls asset() and convertToAssets() — both part of the EIP-4626 standard.
 */
export async function detectERC4626(
  tokenAddress: string,
  provider: JsonRpcProvider
): Promise<DecompositionResult | null> {
  const contract = new Contract(tokenAddress, ERC4626_ABI, provider);

  const asset = await safeCall(contract.asset());
  if (!asset) return null;

  const decimals = await safeCall(contract.decimals());
  if (decimals == null) return null;

  const shares = BigInt(10) ** BigInt(Number(decimals));
  const assets = await safeCall(contract.convertToAssets(shares));
  if (assets == null) return null;

  const underlyingDecimals = await getDecimals(asset, provider);

  return {
    type: "erc4626",
    underlyingTokens: [{ address: asset.toLowerCase(), decimals: underlyingDecimals }],
    ratios: [
      {
        underlyingAddress: asset.toLowerCase(),
        ratio: assets.toString(),
      },
    ],
  };
}

/**
 * Detect Uniswap V2 pair tokens.
 * Requires all of: token0(), token1(), getReserves(), totalSupply().
 */
export async function detectUniswapV2(
  tokenAddress: string,
  provider: JsonRpcProvider
): Promise<DecompositionResult | null> {
  const contract = new Contract(tokenAddress, UNISWAP_V2_ABI, provider);

  const [token0, token1, reserves, totalSupply] = await Promise.all([
    safeCall(contract.token0()),
    safeCall(contract.token1()),
    safeCall(contract.getReserves()),
    safeCall(contract.totalSupply()),
  ]);

  if (!token0 || !token1 || !reserves || !totalSupply) return null;
  if (totalSupply === BigInt(0)) return null;

  const decimals0 = await getDecimals(token0, provider);
  const decimals1 = await getDecimals(token1, provider);

  // Store reserves and totalSupply as ratios — the estimation service will compute value
  return {
    type: "uniswap_v2",
    underlyingTokens: [
      { address: token0.toLowerCase(), decimals: decimals0 },
      { address: token1.toLowerCase(), decimals: decimals1 },
    ],
    ratios: [
      { underlyingAddress: token0.toLowerCase(), ratio: reserves[0].toString() },
      { underlyingAddress: token1.toLowerCase(), ratio: reserves[1].toString() },
      { underlyingAddress: "_totalSupply", ratio: totalSupply.toString() },
    ],
  };
}

/**
 * Detect Compound cToken-style tokens.
 * Calls underlying() and exchangeRateStored().
 */
export async function detectCompound(
  tokenAddress: string,
  provider: JsonRpcProvider
): Promise<DecompositionResult | null> {
  const contract = new Contract(tokenAddress, COMPOUND_ABI, provider);

  const underlying = await safeCall(contract.underlying());
  if (!underlying) return null;

  const exchangeRate = await safeCall(contract.exchangeRateStored());
  if (exchangeRate == null) return null;

  const underlyingDecimals = await getDecimals(underlying, provider);

  return {
    type: "compound",
    underlyingTokens: [{ address: underlying.toLowerCase(), decimals: underlyingDecimals }],
    ratios: [{ underlyingAddress: underlying.toLowerCase(), ratio: exchangeRate.toString() }],
  };
}

/**
 * Detect Aave aToken-style tokens.
 * aTokens are 1:1 with their underlying (balance includes accrued interest).
 */
export async function detectAave(tokenAddress: string, provider: JsonRpcProvider): Promise<DecompositionResult | null> {
  const contract = new Contract(tokenAddress, AAVE_ABI, provider);

  const underlying = await safeCall(contract.UNDERLYING_ASSET_ADDRESS());
  if (!underlying) return null;

  const underlyingDecimals = await getDecimals(underlying, provider);

  return {
    type: "aave",
    underlyingTokens: [{ address: underlying.toLowerCase(), decimals: underlyingDecimals }],
    // 1:1 ratio — aToken balance directly represents underlying value
    ratios: [{ underlyingAddress: underlying.toLowerCase(), ratio: "1" }],
  };
}

/**
 * Detect simple wrapper tokens (WETH-style).
 * Tries underlying() then token() — if either returns a valid address, treat as 1:1 wrapper.
 */
export async function detectWrapper(
  tokenAddress: string,
  provider: JsonRpcProvider
): Promise<DecompositionResult | null> {
  const contract = new Contract(tokenAddress, WRAPPER_ABI, provider);

  let underlying = await safeCall(contract.underlying());
  if (!underlying) {
    underlying = await safeCall(contract.token());
  }
  if (!underlying) return null;

  // Sanity check: underlying should not be the zero address or self
  if (underlying === "0x0000000000000000000000000000000000000000") return null;
  if (underlying.toLowerCase() === tokenAddress.toLowerCase()) return null;

  const underlyingDecimals = await getDecimals(underlying, provider);

  return {
    type: "wrapper",
    underlyingTokens: [{ address: underlying.toLowerCase(), decimals: underlyingDecimals }],
    ratios: [{ underlyingAddress: underlying.toLowerCase(), ratio: "1" }],
  };
}

/**
 * Run all detectors in cascade order. Returns the first match, or { type: "unknown" }.
 * Order matters: ERC4626 is the most specific standard, then V2, then protocol-specific.
 */
export async function detectTokenType(tokenAddress: string, provider: JsonRpcProvider): Promise<DecompositionResult> {
  const detectors = [detectERC4626, detectUniswapV2, detectCompound, detectAave, detectWrapper];

  for (const detector of detectors) {
    const result = await detector(tokenAddress, provider);
    if (result) return result;
  }

  return {
    type: "unknown",
    underlyingTokens: [],
    ratios: [],
  };
}

/**
 * Refresh exchange rates for a previously detected token.
 * Only makes the minimal RPC calls needed based on the known decomposition type.
 */
export async function refreshRatios(
  tokenAddress: string,
  type: DecompositionType,
  provider: JsonRpcProvider
): Promise<CachedRatio[] | null> {
  switch (type) {
    case "erc4626": {
      const contract = new Contract(tokenAddress, ERC4626_ABI, provider);
      const decimals = await safeCall(contract.decimals());
      if (decimals == null) return null;
      const asset = await safeCall(contract.asset());
      if (!asset) return null;
      const shares = BigInt(10) ** BigInt(Number(decimals));
      const assets = await safeCall(contract.convertToAssets(shares));
      if (assets == null) return null;
      return [{ underlyingAddress: asset.toLowerCase(), ratio: assets.toString() }];
    }
    case "uniswap_v2": {
      const contract = new Contract(tokenAddress, UNISWAP_V2_ABI, provider);
      const [token0, token1, reserves, totalSupply] = await Promise.all([
        safeCall(contract.token0()),
        safeCall(contract.token1()),
        safeCall(contract.getReserves()),
        safeCall(contract.totalSupply()),
      ]);
      if (!token0 || !token1 || !reserves || !totalSupply) return null;
      return [
        { underlyingAddress: token0.toLowerCase(), ratio: reserves[0].toString() },
        { underlyingAddress: token1.toLowerCase(), ratio: reserves[1].toString() },
        { underlyingAddress: "_totalSupply", ratio: totalSupply.toString() },
      ];
    }
    case "compound": {
      const contract = new Contract(tokenAddress, COMPOUND_ABI, provider);
      const underlying = await safeCall(contract.underlying());
      if (!underlying) return null;
      const exchangeRate = await safeCall(contract.exchangeRateStored());
      if (exchangeRate == null) return null;
      return [{ underlyingAddress: underlying.toLowerCase(), ratio: exchangeRate.toString() }];
    }
    case "aave":
      // 1:1 ratio, no refresh needed
      return null;
    case "wrapper":
      // 1:1 ratio, no refresh needed
      return null;
    default:
      return null;
  }
}
