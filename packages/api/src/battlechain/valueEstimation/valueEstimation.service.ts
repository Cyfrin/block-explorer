import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { JsonRpcProvider } from "ethers";
import { ConfigService } from "@nestjs/config";
import { AgreementCurrentState } from "../agreementCurrentState.entity";
import { TokenDecomposition, DecompositionType } from "../tokenDecomposition.entity";
import { detectTokenType, refreshRatios } from "./tokenDetectors";
import { fetchDefillamaPrices, DefillamaPrice } from "./defillamaProvider";
import { BASE_TOKEN_L2_ADDRESS } from "../../common/constants";

interface TokenBalance {
  tokenAddress: string;
  balance: string; // raw integer string
  decimals: number;
  symbol: string | null;
  usdPrice: number | null;
  l1Address: string | null;
}

export interface PricedToken {
  symbol: string;
  address: string;
  usd: number;
}

export interface UnpricedToken {
  symbol: string | null;
  address: string;
}

interface EstimationResult {
  valueBand: string;
  valuePricedUsd: number | null;
  valueNativeUsd: number | null;
  valuePricedTokens: PricedToken[];
  valueUnpricedTokens: UnpricedToken[];
  valueConfidence: string;
}

const VALUE_BANDS = [
  { threshold: 10_000_000, label: "$10M+" },
  { threshold: 1_000_000, label: "$1M - $10M" },
  { threshold: 100_000, label: "$100K - $1M" },
  { threshold: 10_000, label: "$10K - $100K" },
  { threshold: 0, label: "< $10K" },
];

@Injectable()
export class ValueEstimationService {
  private readonly logger = new Logger(ValueEstimationService.name);
  private readonly rpcProvider: JsonRpcProvider | null = null;

  constructor(
    private readonly dataSource: DataSource,
    configService: ConfigService,
    @InjectRepository(AgreementCurrentState)
    private readonly agreementStateRepository: Repository<AgreementCurrentState>,
    @InjectRepository(TokenDecomposition)
    private readonly tokenDecompositionRepository: Repository<TokenDecomposition>
  ) {
    const rpcUrl = configService.get<string>("battlechainRpcUrl");
    if (rpcUrl) {
      this.rpcProvider = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
    }
  }

  /**
   * Main entry point — called by the 30-minute timer.
   * Estimates locked value for all safe harbor agreements.
   */
  async estimateAllAgreements(): Promise<void> {
    try {
      const agreements = await this.agreementStateRepository.find();

      if (agreements.length === 0) return;

      this.logger.log(`Estimating value for ${agreements.length} agreements`);

      // Collect all unique token balances across all agreements
      const allTokenBalances = new Map<string, Map<string, TokenBalance>>();
      for (const agreement of agreements) {
        const contracts = agreement.coveredContracts ?? [];
        if (contracts.length === 0) continue;
        const balances = await this.getTokenBalancesForContracts(contracts);
        allTokenBalances.set(agreement.agreementAddress, balances);
      }

      // Batch-fetch DeFiLlama prices for all bridged tokens
      const allL1Addresses = new Map<string, string>(); // l1Address → l2Address
      for (const balanceMap of allTokenBalances.values()) {
        for (const tb of balanceMap.values()) {
          if (tb.l1Address && !tb.usdPrice) {
            allL1Addresses.set(tb.l1Address.toLowerCase(), tb.tokenAddress.toLowerCase());
          }
        }
      }
      const defillamaPrices = await fetchDefillamaPrices(allL1Addresses);

      // Estimate each agreement
      for (const agreement of agreements) {
        const balanceMap = allTokenBalances.get(agreement.agreementAddress);
        if (!balanceMap || balanceMap.size === 0) {
          await this.storeResult(agreement.agreementAddress, {
            valueBand: "Unknown",
            valuePricedUsd: null,
            valueNativeUsd: null,
            valuePricedTokens: [],
            valueUnpricedTokens: [],
            valueConfidence: "LOW",
          });
          continue;
        }

        const coveredSet = new Set((agreement.coveredContracts ?? []).map((c) => c.toLowerCase().trim()));
        const result = await this.estimateAgreementValue(balanceMap, coveredSet, defillamaPrices, agreement);
        await this.storeResult(agreement.agreementAddress, result);
      }

      this.logger.log(`Value estimation complete for ${agreements.length} agreements`);
    } catch (err) {
      this.logger.error(`Value estimation failed: ${err}`);
    }
  }

  /**
   * Get current token balances for a set of contract addresses.
   * Returns a map of tokenAddress → TokenBalance.
   */
  private async getTokenBalancesForContracts(contractAddresses: string[]): Promise<Map<string, TokenBalance>> {
    const normalizedAddresses = contractAddresses.map((a) => a.toLowerCase().trim());

    // Query latest balance per (address, tokenAddress) with token metadata
    const rows: Array<{
      token_address: string;
      total_balance: string;
      decimals: number;
      symbol: string | null;
      usd_price: number | null;
      l1_address: string | null;
    }> = await this.dataSource.query(
      `
      WITH latest_balances AS (
        SELECT
          b.address,
          b."tokenAddress",
          b.balance,
          ROW_NUMBER() OVER (
            PARTITION BY b.address, b."tokenAddress"
            ORDER BY b."blockNumber" DESC
          ) AS rn
        FROM balances b
        WHERE b.address = ANY($1::bytea[])
      )
      SELECT
        encode(lb."tokenAddress", 'hex') AS token_address,
        SUM(lb.balance::numeric) AS total_balance,
        COALESCE(t.decimals, 18) AS decimals,
        t.symbol AS symbol,
        t."usdPrice" AS usd_price,
        encode(t."l1Address", 'hex') AS l1_address
      FROM latest_balances lb
      LEFT JOIN tokens t ON lb."tokenAddress" = t."l2Address"
      WHERE lb.rn = 1
        AND lb.balance != '0'
      GROUP BY lb."tokenAddress", t.decimals, t.symbol, t."usdPrice", t."l1Address"
      `,
      [normalizedAddresses.map((a) => Buffer.from(a.replace("0x", ""), "hex"))]
    );

    const result = new Map<string, TokenBalance>();
    for (const row of rows) {
      const tokenAddress = "0x" + row.token_address;
      result.set(tokenAddress.toLowerCase(), {
        tokenAddress: tokenAddress.toLowerCase(),
        balance: row.total_balance,
        decimals: row.decimals,
        symbol: row.symbol,
        usdPrice: row.usd_price,
        l1Address: row.l1_address ? "0x" + row.l1_address : null,
      });
    }

    return result;
  }

  /**
   * Estimate the total value for a single agreement.
   */
  private async estimateAgreementValue(
    tokenBalances: Map<string, TokenBalance>,
    coveredContracts: Set<string>,
    defillamaPrices: Map<string, DefillamaPrice>,
    agreement: AgreementCurrentState
  ): Promise<EstimationResult> {
    let totalPricedUsd = 0;
    let nativeUsd = 0;
    const pricedTokens: PricedToken[] = [];
    const unpricedTokens: UnpricedToken[] = [];

    for (const [tokenAddress, tb] of tokenBalances) {
      // Double-counting prevention: exclude tokens issued by in-scope contracts
      if (coveredContracts.has(tokenAddress)) continue;

      const balanceBN = BigInt(tb.balance);
      if (balanceBN === BigInt(0)) continue;

      // Try to resolve a USD price through the 3-layer cascade
      const priceInfo = await this.resolveTokenPrice(tokenAddress, tb, defillamaPrices, coveredContracts);

      if (priceInfo != null) {
        totalPricedUsd += priceInfo;
        pricedTokens.push({
          symbol: tb.symbol || tokenAddress.slice(0, 10) + "…",
          address: tokenAddress,
          usd: priceInfo,
        });

        // Track native token value separately
        if (tokenAddress.toLowerCase() === BASE_TOKEN_L2_ADDRESS.toLowerCase()) {
          nativeUsd = priceInfo;
        }
      } else {
        unpricedTokens.push({
          symbol: tb.symbol || null,
          address: tokenAddress,
        });
      }
    }

    // Sort priced tokens by value descending
    pricedTokens.sort((a, b) => b.usd - a.usd);

    const valueBand = this.computeBand(totalPricedUsd);
    const valueConfidence = this.computeConfidence(pricedTokens.length, unpricedTokens.length);

    return {
      valueBand,
      valuePricedUsd: totalPricedUsd,
      valueNativeUsd: nativeUsd,
      valuePricedTokens: pricedTokens,
      valueUnpricedTokens: unpricedTokens,
      valueConfidence,
    };
  }

  /**
   * Resolve USD value for a token balance through the 3-layer pricing cascade.
   * Returns total USD value or null if unpriced.
   */
  private async resolveTokenPrice(
    tokenAddress: string,
    tb: TokenBalance,
    defillamaPrices: Map<string, DefillamaPrice>,
    coveredContracts: Set<string>
  ): Promise<number | null> {
    const balanceNum = Number(BigInt(tb.balance)) / Math.pow(10, tb.decimals);

    // Layer 1: DeFiLlama (primary for bridged tokens)
    const defillamaPrice = defillamaPrices.get(tokenAddress.toLowerCase());
    if (defillamaPrice) {
      return balanceNum * defillamaPrice.price;
    }

    // Layer 2: CoinGecko fallback (cached in tokens.usdPrice)
    if (tb.usdPrice != null && tb.usdPrice > 0) {
      return balanceNum * tb.usdPrice;
    }

    // Layer 3: Local detection for native tokens
    if (!this.rpcProvider) return null;

    return this.resolveViaDetection(tokenAddress, tb, coveredContracts);
  }

  /**
   * Use the local detector pipeline + decomposition cache to price a native token.
   */
  private async resolveViaDetection(
    tokenAddress: string,
    tb: TokenBalance,
    coveredContracts: Set<string>
  ): Promise<number | null> {
    try {
      // Check decomposition cache first
      let decomposition = await this.tokenDecompositionRepository.findOne({
        where: { tokenAddress: tokenAddress.toLowerCase() },
      });

      if (!decomposition) {
        // Run detection cascade
        const result = await detectTokenType(tokenAddress, this.rpcProvider);

        decomposition = this.tokenDecompositionRepository.create({
          tokenAddress: tokenAddress.toLowerCase(),
          decompositionType: result.type,
          underlyingTokens: result.underlyingTokens,
          source: "auto_detected",
          detectedAt: new Date(),
          lastRatioUpdate: new Date(),
          cachedRatios: result.ratios,
        });

        await this.tokenDecompositionRepository.save(decomposition);
      } else if (
        decomposition.decompositionType !== "unknown" &&
        decomposition.decompositionType !== "aave" &&
        decomposition.decompositionType !== "wrapper"
      ) {
        // Refresh ratios for types that have dynamic exchange rates
        const freshRatios = await refreshRatios(tokenAddress, decomposition.decompositionType, this.rpcProvider);
        if (freshRatios) {
          decomposition.cachedRatios = freshRatios;
          decomposition.lastRatioUpdate = new Date();
          await this.tokenDecompositionRepository.save(decomposition);
        }
      }

      if (decomposition.decompositionType === "unknown") return null;

      return this.computeDecomposedValue(tb, decomposition, coveredContracts);
    } catch (err) {
      this.logger.warn(`Detection failed for ${tokenAddress}: ${err}`);
      return null;
    }
  }

  /**
   * Compute USD value from a decomposed token's balance + cached ratios.
   */
  private async computeDecomposedValue(
    tb: TokenBalance,
    decomposition: TokenDecomposition,
    coveredContracts: Set<string>
  ): Promise<number | null> {
    if (!decomposition.cachedRatios || !decomposition.underlyingTokens) return null;

    const balance = BigInt(tb.balance);

    if (decomposition.decompositionType === "uniswap_v2") {
      return this.computeV2Value(balance, tb.decimals, decomposition, coveredContracts);
    }

    // For ERC4626, Compound, Aave, Wrapper: single underlying with a ratio
    const underlying = decomposition.underlyingTokens[0];
    if (!underlying) return null;

    const ratioEntry = decomposition.cachedRatios.find((r) => r.underlyingAddress === underlying.address);
    if (!ratioEntry) return null;

    // Get underlying token price
    const underlyingPrice = await this.getTokenUsdPrice(underlying.address);
    if (underlyingPrice == null) return null;

    if (decomposition.decompositionType === "erc4626") {
      // ratio = convertToAssets(10^decimals) — assets per 1 share
      const ratioBN = BigInt(ratioEntry.ratio);
      const shareUnit = BigInt(10) ** BigInt(tb.decimals);
      const underlyingAmount = (balance * ratioBN) / shareUnit;
      return (Number(underlyingAmount) / Math.pow(10, underlying.decimals)) * underlyingPrice;
    }

    if (decomposition.decompositionType === "compound") {
      // Compound exchangeRate = underlyingAmount * 1e18 / cTokenAmount
      const ratioBN = BigInt(ratioEntry.ratio);
      const underlyingAmount = (balance * ratioBN) / BigInt(10) ** BigInt(18);
      return (Number(underlyingAmount) / Math.pow(10, underlying.decimals)) * underlyingPrice;
    }

    // Aave / Wrapper: 1:1 ratio
    return (Number(balance) / Math.pow(10, tb.decimals)) * underlyingPrice;
  }

  /**
   * Compute USD value for a Uniswap V2 LP token position.
   * value = (balance / totalSupply) * (reserve0 * price0 + reserve1 * price1)
   */
  private async computeV2Value(
    balance: bigint,
    decimals: number,
    decomposition: TokenDecomposition,
    coveredContracts: Set<string>
  ): Promise<number | null> {
    if (!decomposition.underlyingTokens || decomposition.underlyingTokens.length < 2) return null;
    if (!decomposition.cachedRatios) return null;

    const token0 = decomposition.underlyingTokens[0];
    const token1 = decomposition.underlyingTokens[1];

    // Skip if this LP token's pool is an in-scope contract (reserves already counted directly)
    // The tokenAddress of the decomposition IS the pool address for V2
    if (coveredContracts.has(decomposition.tokenAddress.toLowerCase().trim())) return null;

    const reserve0Entry = decomposition.cachedRatios.find((r) => r.underlyingAddress === token0.address);
    const reserve1Entry = decomposition.cachedRatios.find((r) => r.underlyingAddress === token1.address);
    const totalSupplyEntry = decomposition.cachedRatios.find((r) => r.underlyingAddress === "_totalSupply");

    if (!reserve0Entry || !reserve1Entry || !totalSupplyEntry) return null;

    const totalSupply = BigInt(totalSupplyEntry.ratio);
    if (totalSupply === BigInt(0)) return null;

    const reserve0 = Number(BigInt(reserve0Entry.ratio)) / Math.pow(10, token0.decimals);
    const reserve1 = Number(BigInt(reserve1Entry.ratio)) / Math.pow(10, token1.decimals);

    const price0 = await this.getTokenUsdPrice(token0.address);
    const price1 = await this.getTokenUsdPrice(token1.address);

    // If we can price at least one side, estimate using 2x that side's value
    let poolValueUsd = 0;
    if (price0 != null && price1 != null) {
      poolValueUsd = reserve0 * price0 + reserve1 * price1;
    } else if (price0 != null) {
      poolValueUsd = reserve0 * price0 * 2;
    } else if (price1 != null) {
      poolValueUsd = reserve1 * price1 * 2;
    } else {
      return null;
    }

    const share = Number(balance) / Number(totalSupply);
    return share * poolValueUsd;
  }

  /**
   * Look up a token's USD price from the tokens table.
   */
  private async getTokenUsdPrice(tokenAddress: string): Promise<number | null> {
    const rows: Array<{ usd_price: number | null }> = await this.dataSource.query(
      `SELECT "usdPrice" AS usd_price FROM tokens WHERE "l2Address" = $1 LIMIT 1`,
      [Buffer.from(tokenAddress.replace("0x", ""), "hex")]
    );
    return rows[0]?.usd_price ?? null;
  }

  private computeBand(pricedUsd: number): string {
    for (const band of VALUE_BANDS) {
      if (pricedUsd >= band.threshold) return band.label;
    }
    return "< $10K";
  }

  private computeConfidence(pricedTokenCount: number, unpricedTokenCount: number): string {
    if (unpricedTokenCount === 0) return "HIGH";
    const total = pricedTokenCount + unpricedTokenCount;
    if (total === 0) return "LOW";
    return unpricedTokenCount / total <= 0.25 ? "MEDIUM" : "LOW";
  }

  private async storeResult(agreementAddress: string, result: EstimationResult): Promise<void> {
    await this.agreementStateRepository.update(
      { agreementAddress },
      {
        valueBand: result.valueBand,
        valuePricedUsd: result.valuePricedUsd === null ? null : result.valuePricedUsd.toString(),
        valueNativeUsd: result.valueNativeUsd === null ? null : result.valueNativeUsd.toString(),
        valuePricedTokens: result.valuePricedTokens,
        valueUnpricedTokens: result.valueUnpricedTokens,
        valueConfidence: result.valueConfidence,
        valueEstimatedAt: new Date(),
      }
    );
  }
}
