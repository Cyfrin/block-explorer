import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { bigIntNumberTransformer } from "../../common/transformers/bigIntNumber.transformer";

/**
 * Materialized state for a ConfidencePool clone. Maintained by the SQL triggers in
 * packages/battlechain-indexer/sql/create-confidence-pool-current-state.sql.
 *
 * Maps to: battlechainindexer_confidence_pool.confidence_pool_current_state
 */
@Entity({ name: "confidence_pool_current_state", schema: "battlechainindexer_confidence_pool" })
export class ConfidencePoolCurrentState {
  @PrimaryColumn({ name: "pool_address", type: "char", length: 42 })
  poolAddress: string;

  @Index()
  @Column({ name: "agreement_address", type: "char", length: 42, nullable: true })
  agreementAddress: string | null;

  @Index()
  @Column({ name: "stake_token", type: "char", length: 42, nullable: true })
  stakeToken: string | null;

  @Column({ name: "safe_harbor_registry", type: "char", length: 42, nullable: true })
  safeHarborRegistry: string | null;

  @Column({ name: "outcome_moderator", type: "char", length: 42, nullable: true })
  outcomeModerator: string | null;

  @Column({ name: "recovery_address", type: "char", length: 42, nullable: true })
  recoveryAddress: string | null;

  @Column({ name: "owner", type: "char", length: 42, nullable: true })
  owner: string | null;

  @Column({ name: "pending_owner", type: "char", length: 42, nullable: true })
  pendingOwner: string | null;

  @Column({ name: "expiry", type: "numeric", nullable: true })
  expiry: string | null;

  @Column({ name: "min_stake", type: "numeric", nullable: true })
  minStake: string | null;

  @Column({ name: "created_at_block", type: "numeric", transformer: bigIntNumberTransformer, nullable: true })
  createdAtBlock: number | null;

  @Column({ name: "created_at", type: "timestamptz", nullable: true })
  createdAt: Date | null;

  @Column({ name: "created_tx_hash", type: "char", length: 66, nullable: true })
  createdTxHash: string | null;

  @Column({ name: "scope_accounts", type: "text", array: true, nullable: true })
  scopeAccounts: string[] | null;

  @Column({ name: "scope_locked", type: "boolean", default: false })
  scopeLocked: boolean;

  @Column({ name: "scope_locked_at", type: "timestamptz", nullable: true })
  scopeLockedAt: Date | null;

  @Column({ name: "scope_updated_at", type: "timestamptz", nullable: true })
  scopeUpdatedAt: Date | null;

  @Column({ name: "total_eligible_stake", type: "numeric", default: 0 })
  totalEligibleStake: string;

  @Column({ name: "total_bonus", type: "numeric", default: 0 })
  totalBonus: string;

  @Column({ name: "staker_count", type: "int", default: 0 })
  stakerCount: number;

  @Column({ name: "expiry_locked", type: "boolean", default: false })
  expiryLocked: boolean;

  @Column({ name: "risk_window_start", type: "numeric", nullable: true })
  riskWindowStart: string | null;

  @Column({ name: "risk_window_started_at", type: "timestamptz", nullable: true })
  riskWindowStartedAt: Date | null;

  @Column({ name: "risk_window_end", type: "numeric", nullable: true })
  riskWindowEnd: string | null;

  @Column({ name: "risk_window_ended_at", type: "timestamptz", nullable: true })
  riskWindowEndedAt: Date | null;

  // 0=UNRESOLVED, 1=SURVIVED, 2=CORRUPTED, 3=EXPIRED
  @Column({ name: "outcome", type: "smallint", default: 0 })
  outcome: number;

  @Column({ name: "good_faith", type: "boolean", nullable: true })
  goodFaith: boolean | null;

  @Column({ name: "attacker", type: "char", length: 42, nullable: true })
  attacker: string | null;

  // Real-world resolution time. NEVER derive from the `outcomeFlaggedAt` storage var.
  @Column({ name: "outcome_flagged_at", type: "timestamptz", nullable: true })
  outcomeFlaggedAt: Date | null;

  @Column({ name: "outcome_flagged_at_block", type: "numeric", transformer: bigIntNumberTransformer, nullable: true })
  outcomeFlaggedAtBlock: number | null;

  @Column({ name: "outcome_flagged_by", type: "char", length: 42, nullable: true })
  outcomeFlaggedBy: string | null;

  @Column({ name: "outcome_flagged_tx_hash", type: "char", length: 66, nullable: true })
  outcomeFlaggedTxHash: string | null;

  @Column({ name: "corrupted_claim_deadline", type: "numeric", nullable: true })
  corruptedClaimDeadline: string | null;

  @Column({ name: "claims_started", type: "boolean", default: false })
  claimsStarted: boolean;

  @Column({ name: "bounty_entitlement", type: "numeric", nullable: true })
  bountyEntitlement: string | null;

  @Column({ name: "bounty_claimed", type: "numeric", default: 0 })
  bountyClaimed: string;

  @Column({ name: "paused", type: "boolean", default: false })
  paused: boolean;

  @Column({ name: "paused_at", type: "timestamptz", nullable: true })
  pausedAt: Date | null;

  @Column({ name: "registry_state", type: "varchar", length: 24, nullable: true })
  registryState: string | null;

  @Column({ name: "registry_state_observed_at", type: "timestamptz", nullable: true })
  registryStateObservedAt: Date | null;

  @Index()
  @Column({ name: "phase", type: "varchar", length: 32, default: "PRE_STAKE" })
  phase: string;

  @Column({ name: "snapshot_total_staked", type: "numeric", nullable: true })
  snapshotTotalStaked: string | null;

  @Column({ name: "snapshot_total_bonus", type: "numeric", nullable: true })
  snapshotTotalBonus: string | null;

  @Column({ name: "snapshot_sum_stake_time", type: "numeric", nullable: true })
  snapshotSumStakeTime: string | null;

  @Column({ name: "snapshot_sum_stake_time_sq", type: "numeric", nullable: true })
  snapshotSumStakeTimeSq: string | null;

  @Column({ name: "snapshot_at", type: "timestamptz", nullable: true })
  snapshotAt: Date | null;

  @Column({ name: "value_band", type: "varchar", length: 20, nullable: true })
  valueBand: string | null;

  @Column({ name: "value_priced_usd", type: "numeric", nullable: true })
  valuePricedUsd: string | null;

  @Column({ name: "value_estimated_at", type: "timestamptz", nullable: true })
  valueEstimatedAt: Date | null;

  @Column({ name: "last_updated_at", type: "timestamptz", nullable: true })
  lastUpdatedAt: Date | null;

  @Column({ name: "rpc_fetched_at", type: "timestamptz", nullable: true })
  rpcFetchedAt: Date | null;
}
