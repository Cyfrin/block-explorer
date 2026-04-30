import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { mock } from "jest-mock-extended";
import { DataSource, Repository } from "typeorm";
import { ValueEstimationService } from "./valueEstimation.service";
import { AgreementCurrentState } from "../agreementCurrentState.entity";
import { TokenDecomposition } from "../tokenDecomposition.entity";
import * as defillamaProvider from "./defillamaProvider";

// Every agreement in these tests uses this address.
const AGREEMENT_ADDR = "0xagreement00000000000000000000000000000000";
// Shorthand for readable test addresses — the service lowercases before comparing.
const addr = (hex: string) => `0x${hex.padEnd(40, "0")}`;

// Build an AgreementCurrentState skeleton; callers override just what they need.
const makeAgreement = (overrides: Partial<AgreementCurrentState> = {}): AgreementCurrentState =>
  ({
    agreementAddress: AGREEMENT_ADDR,
    coveredContracts: [addr("c0"), addr("c1")],
    ...overrides,
  }) as AgreementCurrentState;

describe("ValueEstimationService", () => {
  let service: ValueEstimationService;
  let dataSource: jest.Mocked<DataSource>;
  let agreementStateRepository: jest.Mocked<Repository<AgreementCurrentState>>;
  let tokenDecompositionRepository: jest.Mocked<Repository<TokenDecomposition>>;
  let configService: jest.Mocked<ConfigService>;
  let fetchDefillamaPricesSpy: jest.SpyInstance;

  beforeEach(async () => {
    dataSource = mock<DataSource>();
    agreementStateRepository = mock<Repository<AgreementCurrentState>>();
    tokenDecompositionRepository = mock<Repository<TokenDecomposition>>();
    configService = mock<ConfigService>();

    // Default: no RPC URL. Tests that need Layer 3 detection set one explicitly.
    (configService.get as jest.Mock).mockReturnValue(null);

    // Default: DeFiLlama returns nothing. Individual tests override.
    fetchDefillamaPricesSpy = jest.spyOn(defillamaProvider, "fetchDefillamaPrices").mockResolvedValue(new Map());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValueEstimationService,
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(AgreementCurrentState), useValue: agreementStateRepository },
        { provide: getRepositoryToken(TokenDecomposition), useValue: tokenDecompositionRepository },
      ],
    }).compile();

    service = module.get<ValueEstimationService>(ValueEstimationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Shape of rows returned by the raw SQL in getTokenBalancesForContracts.
   * We stub dataSource.query with these directly so we don't exercise SQL.
   */
  type BalanceRow = {
    token_address: string; // hex, no 0x prefix
    total_balance: string;
    decimals: number;
    symbol: string | null;
    usd_price: number | null;
    l1_address: string | null;
  };

  // Stub dataSource.query to return given rows once per agreement being priced.
  // estimateAllAgreements calls getTokenBalancesForContracts once per agreement.
  const stubBalanceRows = (rowsPerCall: BalanceRow[][]) => {
    (dataSource.query as jest.Mock).mockImplementation(async () => rowsPerCall.shift() ?? []);
  };

  // Helper: assert the stored result for the single-agreement happy path.
  const getStoredResult = () => {
    expect(agreementStateRepository.update).toHaveBeenCalledTimes(1);
    const [filter, patch] = (agreementStateRepository.update as jest.Mock).mock.calls[0];
    expect(filter).toEqual({ agreementAddress: AGREEMENT_ADDR });
    return patch;
  };

  describe("computeBand (via storeResult)", () => {
    // These thresholds are a product decision — any change should be deliberate.
    // Testing through the public API so a refactor of computeBand stays covered.
    const bandCases: Array<[number, string]> = [
      [0, "< $10K"],
      [9_999, "< $10K"],
      [10_000, "$10K - $100K"],
      [99_999, "$10K - $100K"],
      [100_000, "$100K - $1M"],
      [999_999, "$100K - $1M"],
      [1_000_000, "$1M - $10M"],
      [9_999_999, "$1M - $10M"],
      [10_000_000, "$10M+"],
      [100_000_000, "$10M+"],
    ];

    it.each(bandCases)("totalPricedUsd=%s → %s", async (usd, expectedBand) => {
      // Fabricate a token whose balance × price = usd exactly.
      // 1 unit of a 0-decimal token priced at $usd each.
      stubBalanceRows([
        [
          {
            token_address: "aa".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "TEST",
            usd_price: usd,
            l1_address: null,
          },
        ],
      ]);
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      expect(getStoredResult().valueBand).toBe(expectedBand);
    });
  });

  describe("computeConfidence", () => {
    // This is the spec for the ratio-based confidence rule introduced in this PR.
    // The old rule (absolute unpriced count ≤ 2 → MEDIUM) silently marked
    // 1-of-1-unpriced agreements as MEDIUM, which was wrong.
    it("returns HIGH when every token is priced", async () => {
      stubBalanceRows([
        [
          {
            token_address: "aa".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "A",
            usd_price: 5,
            l1_address: null,
          },
          {
            token_address: "bb".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "B",
            usd_price: 5,
            l1_address: null,
          },
        ],
      ]);
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      expect(getStoredResult().valueConfidence).toBe("HIGH");
    });

    it("returns LOW when the only token is unpriced (the regression case)", async () => {
      stubBalanceRows([
        [
          {
            token_address: "aa".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "A",
            usd_price: null,
            l1_address: null,
          },
        ],
      ]);
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      const patch = getStoredResult();
      expect(patch.valueConfidence).toBe("LOW");
      expect(patch.valueUnpricedTokens).toHaveLength(1);
      expect(patch.valuePricedTokens).toHaveLength(0);
    });

    it("returns MEDIUM when ≤ 25% of tokens are unpriced", async () => {
      // 1 unpriced out of 4 = 25% → MEDIUM
      const priced = [1, 2, 3].map((i) => ({
        token_address: `${i}${i}`.padEnd(40, "0"),
        total_balance: "1",
        decimals: 0,
        symbol: `T${i}`,
        usd_price: 5,
        l1_address: null,
      }));
      const unpriced = {
        token_address: "ff".padEnd(40, "0"),
        total_balance: "1",
        decimals: 0,
        symbol: "UP",
        usd_price: null,
        l1_address: null,
      };
      stubBalanceRows([[...priced, unpriced]]);
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      expect(getStoredResult().valueConfidence).toBe("MEDIUM");
    });

    it("returns LOW when > 25% of tokens are unpriced", async () => {
      // 2 unpriced out of 4 = 50% → LOW
      const rows = [
        { usd_price: 5 as number | null },
        { usd_price: 5 as number | null },
        { usd_price: null as number | null },
        { usd_price: null as number | null },
      ].map((o, i) => ({
        token_address: `${i + 1}${i + 1}`.padEnd(40, "0"),
        total_balance: "1",
        decimals: 0,
        symbol: `T${i}`,
        usd_price: o.usd_price,
        l1_address: null,
      }));
      stubBalanceRows([rows]);
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      expect(getStoredResult().valueConfidence).toBe("LOW");
    });
  });

  describe("price cascade", () => {
    // Layer 1: DeFiLlama. Layer 2: tokens.usdPrice cache. Layer 3: decomposition.
    // Cascade order matters — a bug reordering these could silently change
    // which oracle a priced token uses, affecting TVL across all agreements.
    it("uses DeFiLlama's price when the token has no cached CoinGecko price but has an L1 address", async () => {
      // Note on the real cascade: the service only submits a token to DeFiLlama
      // when the cache is empty (see valueEstimation.service.ts — the l1ToL2 map
      // skips tokens whose usdPrice is already set). So in practice DeFiLlama
      // only fills gaps in the cache, even though the resolveTokenPrice function
      // reads "DeFiLlama first, then cache". This test pins that observable
      // behaviour.
      const tokenAddr = "0x" + "aa".padEnd(40, "0");
      const l1Addr = "0x" + "bb".padEnd(40, "0");

      stubBalanceRows([
        [
          {
            token_address: "aa".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "T",
            usd_price: null, // no cache → eligible for DeFiLlama
            l1_address: "bb".padEnd(40, "0"),
          },
        ],
      ]);
      fetchDefillamaPricesSpy.mockResolvedValue(
        new Map([[tokenAddr.toLowerCase(), { price: 50, confidence: 1, decimals: 0, symbol: "T" }]])
      );
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      const patch = getStoredResult();
      expect(Number(patch.valuePricedUsd)).toBe(50);
      expect(patch.valuePricedTokens).toEqual([expect.objectContaining({ usd: 50, address: tokenAddr.toLowerCase() })]);
      const [l1ToL2Map] = fetchDefillamaPricesSpy.mock.calls[0];
      expect(l1ToL2Map.get(l1Addr.toLowerCase())).toBe(tokenAddr.toLowerCase());
    });

    it("does not ask DeFiLlama about tokens that already have a cached CoinGecko price", async () => {
      // This is the flip side of the cascade-order note above: a cached token
      // is NOT submitted to DeFiLlama at all, even if an L1 address is available.
      // If this ever changes (e.g. to prefer fresh DeFiLlama prices over stale
      // cache), this test becomes the signal that it was a deliberate choice.
      stubBalanceRows([
        [
          {
            token_address: "aa".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "T",
            usd_price: 100,
            l1_address: "bb".padEnd(40, "0"),
          },
        ],
      ]);
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      const [l1ToL2Map] = fetchDefillamaPricesSpy.mock.calls[0];
      expect(l1ToL2Map.size).toBe(0);
      // And the cached price was used verbatim.
      expect(Number(getStoredResult().valuePricedUsd)).toBe(100);
    });

    it("falls back to the CoinGecko cache when DeFiLlama has no price", async () => {
      stubBalanceRows([
        [
          {
            token_address: "aa".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "T",
            usd_price: 42,
            l1_address: "bb".padEnd(40, "0"),
          },
        ],
      ]);
      // DeFiLlama returns empty by default.
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      expect(Number(getStoredResult().valuePricedUsd)).toBe(42);
    });

    it("only asks DeFiLlama about tokens that have an L1 address and no cached price", async () => {
      // Batching up the wrong token set would waste requests (on empty l1) or
      // poison TVL (by letting DeFiLlama overwrite a good CoinGecko number
      // for a token with an L1 address — actually that's fine, it's preferred.
      // The real risk: feeding a null l1 into DeFiLlama as "null" and getting
      // back junk.) So verify the batched set precisely.
      stubBalanceRows([
        [
          {
            // Has cache, has L1 — skipped (we trust the cache? No, we still
            // want DeFiLlama. The service only batches tokens WITHOUT a cache.)
            token_address: "aa".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "CACHED_WITH_L1",
            usd_price: 1,
            l1_address: "11".padEnd(40, "0"),
          },
          {
            // No cache, has L1 — batched.
            token_address: "bb".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "UNCACHED_WITH_L1",
            usd_price: null,
            l1_address: "22".padEnd(40, "0"),
          },
          {
            // No cache, no L1 — cannot query DeFiLlama.
            token_address: "cc".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "NO_L1",
            usd_price: null,
            l1_address: null,
          },
        ],
      ]);
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      expect(fetchDefillamaPricesSpy).toHaveBeenCalledTimes(1);
      const [l1ToL2Map] = fetchDefillamaPricesSpy.mock.calls[0];
      const keys = Array.from(l1ToL2Map.keys());
      // Only UNCACHED_WITH_L1's L1 should be batched; the other two are excluded.
      expect(keys).toEqual(["0x" + "22".padEnd(40, "0")]);
    });

    it("leaves a token unpriced when all layers fail", async () => {
      stubBalanceRows([
        [
          {
            token_address: "aa".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "ORPHAN",
            usd_price: null,
            l1_address: null,
          },
        ],
      ]);
      // No RPC provider (no Layer 3), no cached price, nothing from DeFiLlama.
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      const patch = getStoredResult();
      expect(Number(patch.valuePricedUsd)).toBe(0);
      expect(patch.valueUnpricedTokens).toEqual([
        expect.objectContaining({ symbol: "ORPHAN", address: "0x" + "aa".padEnd(40, "0") }),
      ]);
    });
  });

  describe("double-counting guard", () => {
    // If a token is issued BY an in-scope contract, its value is already
    // represented by the contract's underlying holdings — counting the token
    // balance on top would double-count.
    it("excludes tokens whose address is one of the agreement's covered contracts", async () => {
      const coveredToken = addr("aa").toLowerCase();
      const externalToken = addr("bb").toLowerCase();

      stubBalanceRows([
        [
          {
            // This token is itself a covered contract — SKIP.
            token_address: "aa".padEnd(40, "0"),
            total_balance: "1000",
            decimals: 0,
            symbol: "SELF",
            usd_price: 10,
            l1_address: null,
          },
          {
            token_address: "bb".padEnd(40, "0"),
            total_balance: "5",
            decimals: 0,
            symbol: "EXT",
            usd_price: 7,
            l1_address: null,
          },
        ],
      ]);
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([
        makeAgreement({ coveredContracts: [coveredToken] }),
      ]);

      await service.estimateAllAgreements();

      const patch = getStoredResult();
      // SELF excluded entirely (not even in unpriced list); only EXT is counted.
      expect(Number(patch.valuePricedUsd)).toBe(35);
      expect(patch.valuePricedTokens).toEqual([expect.objectContaining({ address: externalToken })]);
      expect(patch.valueUnpricedTokens).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it('stores "Unknown" + LOW when the agreement has no balances', async () => {
      stubBalanceRows([[]]); // empty balance rows for this agreement
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      const patch = getStoredResult();
      expect(patch.valueBand).toBe("Unknown");
      expect(patch.valueConfidence).toBe("LOW");
      expect(patch.valuePricedUsd).toBeNull();
      expect(patch.valueNativeUsd).toBeNull();
    });

    it("skips agreements with empty coveredContracts without issuing a balance query", async () => {
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement({ coveredContracts: [] })]);

      await service.estimateAllAgreements();

      // No DB query for balances should be made.
      expect(dataSource.query).not.toHaveBeenCalled();
      // Still writes Unknown/LOW.
      const patch = getStoredResult();
      expect(patch.valueBand).toBe("Unknown");
      expect(patch.valueConfidence).toBe("LOW");
    });

    it("skips the entire run when there are no agreements", async () => {
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([]);

      await service.estimateAllAgreements();

      expect(dataSource.query).not.toHaveBeenCalled();
      expect(fetchDefillamaPricesSpy).not.toHaveBeenCalled();
      expect(agreementStateRepository.update).not.toHaveBeenCalled();
    });

    it("does not throw if a single agreement's computation errors — the whole run is aborted but errors are swallowed", async () => {
      // Current behaviour: top-level try/catch in estimateAllAgreements logs
      // and returns. This test pins that contract so a future refactor
      // (e.g. per-agreement try/catch) is a deliberate choice, not silent.
      (agreementStateRepository.find as jest.Mock).mockRejectedValue(new Error("db down"));

      await expect(service.estimateAllAgreements()).resolves.toBeUndefined();
      expect(agreementStateRepository.update).not.toHaveBeenCalled();
    });

    it("tracks native token USD value separately in valueNativeUsd", async () => {
      const BASE_TOKEN_L2_ADDRESS = "0x000000000000000000000000000000000000800A".toLowerCase();
      stubBalanceRows([
        [
          {
            token_address: BASE_TOKEN_L2_ADDRESS.replace("0x", ""),
            total_balance: "2",
            decimals: 0,
            symbol: "ETH",
            usd_price: 1000,
            l1_address: null,
          },
          {
            token_address: "bb".padEnd(40, "0"),
            total_balance: "1",
            decimals: 0,
            symbol: "USDC",
            usd_price: 50,
            l1_address: null,
          },
        ],
      ]);
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      const patch = getStoredResult();
      expect(Number(patch.valuePricedUsd)).toBe(2050);
      expect(Number(patch.valueNativeUsd)).toBe(2000);
    });
  });

  describe("decimal handling", () => {
    // Regression guard: the service converts raw balance integers using
    // Number(BigInt(balance)) / 10**decimals. Getting this wrong by an order
    // of magnitude is a visible bug that's easy to introduce.
    it("scales an 18-decimal balance against the USD price correctly", async () => {
      stubBalanceRows([
        [
          {
            token_address: "aa".padEnd(40, "0"),
            // 1.5 tokens at 18 decimals
            total_balance: "1500000000000000000",
            decimals: 18,
            symbol: "T",
            usd_price: 2,
            l1_address: null,
          },
        ],
      ]);
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      // 1.5 * $2 = $3
      expect(Number(getStoredResult().valuePricedUsd)).toBeCloseTo(3, 6);
    });

    it("scales a 6-decimal balance (USDC-style) correctly", async () => {
      stubBalanceRows([
        [
          {
            token_address: "aa".padEnd(40, "0"),
            total_balance: "12345000000", // 12345 USDC at 6 decimals
            decimals: 6,
            symbol: "USDC",
            usd_price: 1,
            l1_address: null,
          },
        ],
      ]);
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([makeAgreement()]);

      await service.estimateAllAgreements();

      expect(Number(getStoredResult().valuePricedUsd)).toBeCloseTo(12345, 6);
    });
  });
});
