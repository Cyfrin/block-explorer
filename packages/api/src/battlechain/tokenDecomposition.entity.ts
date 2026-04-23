import { Entity, Column, PrimaryColumn } from "typeorm";

export type DecompositionType = "erc4626" | "uniswap_v2" | "compound" | "aave" | "wrapper" | "unknown";
export type DecompositionSource = "auto_detected" | "admin_override";

export interface UnderlyingToken {
  address: string;
  decimals: number;
}

export interface CachedRatio {
  underlyingAddress: string;
  ratio: string; // stored as string to preserve precision
}

/**
 * Cache for token decomposition results.
 * Token type classifications are stable (a V2 pair stays a V2 pair),
 * so we only refresh exchange rates on each estimation cycle.
 *
 * Maps to: battlechainindexer_agreement.token_decomposition
 */
@Entity({ name: "token_decomposition", schema: "battlechainindexer_agreement" })
export class TokenDecomposition {
  @PrimaryColumn({ name: "token_address", type: "char", length: 42 })
  tokenAddress: string;

  @Column({ name: "decomposition_type", type: "varchar", length: 20 })
  decompositionType: DecompositionType;

  @Column({ name: "underlying_tokens", type: "jsonb", nullable: true })
  underlyingTokens: UnderlyingToken[] | null;

  @Column({ name: "source", type: "varchar", length: 20, default: "auto_detected" })
  source: DecompositionSource;

  @Column({ name: "detected_at", type: "timestamptz", nullable: true })
  detectedAt: Date | null;

  @Column({ name: "last_ratio_update", type: "timestamptz", nullable: true })
  lastRatioUpdate: Date | null;

  @Column({ name: "cached_ratios", type: "jsonb", nullable: true })
  cachedRatios: CachedRatio[] | null;
}
