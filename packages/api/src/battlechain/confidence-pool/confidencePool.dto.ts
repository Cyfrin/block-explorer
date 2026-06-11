import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const POOL_OUTCOME_LABELS = ["UNRESOLVED", "SURVIVED", "CORRUPTED", "EXPIRED"] as const;
export type PoolOutcomeLabel = (typeof POOL_OUTCOME_LABELS)[number];

export const POOL_PHASES = [
  "PRE_STAKE",
  "STAKING_OPEN",
  "SCOPE_LOCKED_OPEN",
  "AT_RISK",
  "EXPIRED_AWAITING_RESOLUTION",
  "AWAITING_MODERATOR",
  "RESOLVED_SURVIVED",
  "RESOLVED_CORRUPTED_GOOD_FAITH",
  "RESOLVED_CORRUPTED_BAD_FAITH",
  "RESOLVED_EXPIRED",
] as const;
export type PoolPhase = (typeof POOL_PHASES)[number];

/**
 * Snapshot of a ConfidencePool's state plus derived/computed fields.
 *
 * Bonus-share math: the UI computes each staker's share with full uint256 precision
 * (BigInt). The snapshot fields below provide the inputs. Formula (handoff §6):
 *
 *   T            = riskWindowEnd for SURVIVED/CORRUPTED, expiry for EXPIRED
 *   userScore    = T^2 * eligibleStake[u] - 2T * userSumStakeTime[u] + userSumStakeTimeSq[u]
 *   globalScore  = T^2 * snapshotTotalStaked - 2T * snapshotSumStakeTime + snapshotSumStakeTimeSq
 *   bonusShare   = userScore * snapshotTotalBonus / globalScore
 *
 * Fallback: if globalScore == 0 (e.g. resolution in the same block as the only stake)
 * or noObservableRisk is true, fall back to amount-weighted shares (or zero for
 * "no observable risk"). The UI is responsible for that branch.
 */
export class ConfidencePoolDto {
  @ApiProperty() poolAddress: string;
  @ApiPropertyOptional() agreementAddress?: string;
  @ApiPropertyOptional() stakeToken?: string;
  @ApiPropertyOptional() safeHarborRegistry?: string;
  @ApiPropertyOptional() outcomeModerator?: string;
  @ApiPropertyOptional() recoveryAddress?: string;
  @ApiPropertyOptional() owner?: string;
  @ApiPropertyOptional() pendingOwner?: string;

  // uint256 fields are returned as strings to preserve full precision
  @ApiPropertyOptional() expiry?: string;
  @ApiPropertyOptional() minStake?: string;

  @ApiPropertyOptional() createdAtBlock?: number;
  @ApiPropertyOptional() createdAt?: Date;
  @ApiPropertyOptional() createdTxHash?: string;

  @ApiPropertyOptional({ type: [String] }) scopeAccounts?: string[];
  @ApiProperty() scopeLocked: boolean;
  @ApiPropertyOptional() scopeLockedAt?: Date;
  @ApiPropertyOptional() scopeUpdatedAt?: Date;

  @ApiProperty() totalEligibleStake: string;
  @ApiProperty() totalBonus: string;
  @ApiProperty() stakerCount: number;
  @ApiProperty() expiryLocked: boolean;

  // Raw uint256 timestamps from the events. Required for the UI's bonus-math (T).
  @ApiPropertyOptional() riskWindowStart?: string;
  @ApiPropertyOptional() riskWindowEnd?: string;
  // Human-friendly equivalents (the indexer's block_timestamp at observation).
  @ApiPropertyOptional() riskWindowStartedAt?: Date;
  @ApiPropertyOptional() riskWindowEndedAt?: Date;

  @ApiProperty({ enum: POOL_OUTCOME_LABELS }) outcomeLabel: PoolOutcomeLabel;
  @ApiPropertyOptional() goodFaith?: boolean;
  @ApiPropertyOptional() attacker?: string;
  // Block timestamp of the OutcomeFlagged event — the real-world resolution time.
  @ApiPropertyOptional() outcomeFlaggedAt?: Date;
  @ApiPropertyOptional() outcomeFlaggedAtBlock?: number;
  // 0x000...0 indicates auto-resolution via claimExpired (no human moderator decision).
  @ApiPropertyOptional() outcomeFlaggedBy?: string;
  @ApiPropertyOptional() outcomeFlaggedTxHash?: string;
  @ApiPropertyOptional() corruptedClaimDeadline?: string;
  @ApiProperty() claimsStarted: boolean;

  @ApiPropertyOptional() bountyEntitlement?: string;
  @ApiProperty() bountyClaimed: string;

  @ApiProperty() paused: boolean;
  @ApiPropertyOptional() pausedAt?: Date;

  @ApiPropertyOptional() registryState?: string;
  @ApiPropertyOptional() registryStateObservedAt?: Date;

  @ApiProperty({ enum: POOL_PHASES }) phase: PoolPhase;

  // Withdrawals are disabled once the risk window has been observed. Derived from
  // riskWindowStart != null so the UI doesn't have to recompute the gate.
  @ApiProperty() withdrawsClosed: boolean;

  // True when no observable risk window was ever sealed for this pool. In that case
  // the bonus pool sweeps to recovery and no shares are paid out.
  @ApiProperty() noObservableRisk: boolean;

  // Snapshot inputs for k=2 bonus-share math (frozen at resolution by the API job).
  // Until snapshotAt is set, these are null/zero and the UI must label any displayed
  // share as provisional.
  @ApiPropertyOptional() snapshotTotalStaked?: string;
  @ApiPropertyOptional() snapshotTotalBonus?: string;
  @ApiPropertyOptional() snapshotSumStakeTime?: string;
  @ApiPropertyOptional() snapshotSumStakeTimeSq?: string;
  @ApiPropertyOptional() snapshotAt?: Date;

  @ApiPropertyOptional() valueBand?: string;
  @ApiPropertyOptional() valuePricedUsd?: string;
  @ApiPropertyOptional() valueEstimatedAt?: Date;

  @ApiPropertyOptional() lastUpdatedAt?: Date;
}

export class ConfidencePoolSummaryDto {
  @ApiProperty() poolAddress: string;
  @ApiPropertyOptional() agreementAddress?: string;
  @ApiPropertyOptional() stakeToken?: string;
  @ApiProperty() totalEligibleStake: string;
  @ApiProperty() totalBonus: string;
  @ApiProperty() stakerCount: number;
  @ApiProperty({ enum: POOL_PHASES }) phase: PoolPhase;
  @ApiProperty({ enum: POOL_OUTCOME_LABELS }) outcomeLabel: PoolOutcomeLabel;
  @ApiPropertyOptional() expiry?: string;
  @ApiPropertyOptional() owner?: string;
  @ApiPropertyOptional() createdAt?: Date;
}

export class PaginatedConfidencePoolsDto {
  @ApiProperty({ type: [ConfidencePoolSummaryDto] }) items: ConfidencePoolSummaryDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  // True if more pages exist beyond this one. UI hides "next" when false.
  @ApiProperty() hasMore: boolean;
}

/**
 * Per-staker view. `bonusShareIsProvisional == true` while outcome is UNRESOLVED;
 * the UI must surface this — k=2 math depends on the unknown resolution time T.
 *
 * Bonus share is intentionally NOT computed server-side. The UI computes it with
 * BigInt arithmetic over the snapshot fields on ConfidencePoolDto plus this object's
 * userSumStakeTime/Sq and eligibleStake — see the DTO doc-comment for the formula.
 */
export class PoolStakerDto {
  @ApiProperty() stakerAddress: string;
  @ApiProperty() eligibleStake: string;
  // k=2 accumulators — derived from events while UNRESOLVED, RPC-snapshotted at resolution.
  @ApiProperty() userSumStakeTime: string;
  @ApiProperty() userSumStakeTimeSq: string;
  @ApiProperty() hasClaimed: boolean;
  @ApiProperty() bountyClaimed: string;
  @ApiProperty() bonusShareIsProvisional: boolean;
}

export class PoolEventDto {
  // Discriminator: rindexer event name (PoolCreated, Staked, Withdrawn, ...).
  @ApiProperty() eventType: string;
  @ApiProperty() blockNumber: number;
  @ApiPropertyOptional() blockTimestamp?: Date;
  @ApiProperty() txHash: string;
  @ApiProperty() logIndex: string;
  // Event-specific args; shape varies by eventType.
  @ApiProperty() payload: Record<string, unknown>;
}

export class FactoryConfigDto {
  @ApiPropertyOptional() factoryAddress?: string;
  @ApiPropertyOptional() safeHarborRegistry?: string;
  @ApiPropertyOptional() poolImplementation?: string;
  @ApiPropertyOptional() defaultOutcomeModerator?: string;
  @ApiPropertyOptional() owner?: string;
  @ApiPropertyOptional() pendingOwner?: string;
  @ApiProperty() paused: boolean;
  @ApiProperty({ type: [String] }) allowedStakeTokens: string[];
  @ApiProperty() poolCount: number;
}
