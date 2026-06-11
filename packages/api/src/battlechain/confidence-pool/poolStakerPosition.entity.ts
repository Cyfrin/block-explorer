import { Entity, Column, PrimaryColumn, Index } from "typeorm";

/**
 * Per-staker position within a ConfidencePool. Maintained by the SQL triggers and
 * snapshotted via RPC at resolution time.
 *
 * Pre-snapshot, the `userSumStakeTime`/`userSumStakeTimeSq` columns are NOT authoritative:
 * they're maintained at 0 until resolution. The API service computes them on demand from
 * the staked event table for unresolved pools. Post-snapshot (snapshotted_at IS NOT NULL),
 * these columns are canonical.
 *
 * Maps to: battlechainindexer_confidence_pool.pool_staker_position
 */
@Entity({ name: "pool_staker_position", schema: "battlechainindexer_confidence_pool" })
export class PoolStakerPosition {
  @PrimaryColumn({ name: "pool_address", type: "char", length: 42 })
  @Index()
  poolAddress: string;

  @PrimaryColumn({ name: "staker_address", type: "char", length: 42 })
  @Index()
  stakerAddress: string;

  @Column({ name: "eligible_stake", type: "numeric", default: 0 })
  eligibleStake: string;

  @Column({ name: "user_sum_stake_time", type: "numeric", default: 0 })
  userSumStakeTime: string;

  @Column({ name: "user_sum_stake_time_sq", type: "numeric", default: 0 })
  userSumStakeTimeSq: string;

  @Column({ name: "has_claimed", type: "boolean", default: false })
  hasClaimed: boolean;

  // Non-zero only for the attacker on good-faith CORRUPTED pools
  @Column({ name: "bounty_claimed", type: "numeric", default: 0 })
  bountyClaimed: string;

  @Column({ name: "snapshotted_at", type: "timestamptz", nullable: true })
  snapshottedAt: Date | null;

  @Column({ name: "last_updated_at", type: "timestamptz", nullable: true })
  lastUpdatedAt: Date | null;
}
