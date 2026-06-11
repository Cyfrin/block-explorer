import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { bigIntNumberTransformer } from "../../common/transformers/bigIntNumber.transformer";

/**
 * Base columns shared by every rindexer-managed event table.
 * Each derived class @Entity-decorates a specific event schema/table.
 *
 * `contract_address` is the address of the ConfidencePool clone that emitted the event.
 */
abstract class BasePoolEvent {
  @PrimaryColumn({ name: "rindexer_id", type: "int" })
  rindexerId: number;

  @Index()
  @Column({ name: "contract_address", type: "char", length: 42 })
  contractAddress: string;

  @Column({ name: "tx_hash", type: "char", length: 66 })
  txHash: string;

  @Column({ name: "block_number", type: "numeric", transformer: bigIntNumberTransformer })
  blockNumber: number;

  @Column({ name: "log_index", type: "varchar", length: 78 })
  logIndex: string;

  @Column({ name: "block_timestamp", type: "timestamptz", nullable: true })
  blockTimestamp: Date | null;
}

/**
 * PoolCreated — emitted by ConfidencePoolFactory when a new pool clone is deployed.
 * Maps to: battlechainindexer_confidence_pool_factory.pool_created
 *
 * Note: this table's `contract_address` is the factory, NOT the pool. The pool address
 * lives in the `pool` column.
 */
@Entity({ name: "pool_created", schema: "battlechainindexer_confidence_pool_factory" })
export class PoolCreatedEvent extends BasePoolEvent {
  @Index()
  @Column({ name: "agreement", type: "char", length: 42, nullable: true })
  agreement: string | null;

  @Index()
  @Column({ name: "pool", type: "char", length: 42, nullable: true })
  pool: string | null;

  @Column({ name: "stake_token", type: "char", length: 42, nullable: true })
  stakeToken: string | null;

  @Column({ name: "expiry", type: "varchar", length: 78, nullable: true })
  expiry: string | null;

  @Column({ name: "min_stake", type: "varchar", length: 78, nullable: true })
  minStake: string | null;

  @Column({ name: "recovery_address", type: "char", length: 42, nullable: true })
  recoveryAddress: string | null;

  @Column({ name: "outcome_moderator", type: "char", length: 42, nullable: true })
  outcomeModerator: string | null;

  @Column({ name: "safe_harbor_registry", type: "char", length: 42, nullable: true })
  safeHarborRegistry: string | null;
}

/** Staked — primary event for staker-position reconstruction. */
@Entity({ name: "staked", schema: "battlechainindexer_confidence_pool" })
export class StakedEvent extends BasePoolEvent {
  @Index()
  @Column({ name: "staker", type: "char", length: 42, nullable: true })
  staker: string | null;

  @Column({ name: "amount", type: "varchar", length: 78, nullable: true })
  amount: string | null;
}

@Entity({ name: "withdrawn", schema: "battlechainindexer_confidence_pool" })
export class WithdrawnEvent extends BasePoolEvent {
  @Index()
  @Column({ name: "staker", type: "char", length: 42, nullable: true })
  staker: string | null;

  @Column({ name: "amount", type: "varchar", length: 78, nullable: true })
  amount: string | null;
}

@Entity({ name: "bonus_contributed", schema: "battlechainindexer_confidence_pool" })
export class BonusContributedEvent extends BasePoolEvent {
  @Column({ name: "contributor", type: "char", length: 42, nullable: true })
  contributor: string | null;

  @Column({ name: "amount", type: "varchar", length: 78, nullable: true })
  amount: string | null;
}

@Entity({ name: "outcome_flagged", schema: "battlechainindexer_confidence_pool" })
export class OutcomeFlaggedEvent extends BasePoolEvent {
  @Column({ name: "moderator", type: "char", length: 42, nullable: true })
  moderator: string | null;

  @Column({ name: "outcome", type: "smallint", nullable: true })
  outcome: number | null;

  @Column({ name: "good_faith", type: "boolean", nullable: true })
  goodFaith: boolean | null;

  @Column({ name: "attacker", type: "char", length: 42, nullable: true })
  attacker: string | null;
}

@Entity({ name: "claim_survived", schema: "battlechainindexer_confidence_pool" })
export class ClaimSurvivedEvent extends BasePoolEvent {
  @Column({ name: "staker", type: "char", length: 42, nullable: true })
  staker: string | null;

  @Column({ name: "principal", type: "varchar", length: 78, nullable: true })
  principal: string | null;

  @Column({ name: "bonus_share", type: "varchar", length: 78, nullable: true })
  bonusShare: string | null;
}

@Entity({ name: "claim_expired", schema: "battlechainindexer_confidence_pool" })
export class ClaimExpiredEvent extends BasePoolEvent {
  @Column({ name: "staker", type: "char", length: 42, nullable: true })
  staker: string | null;

  @Column({ name: "principal", type: "varchar", length: 78, nullable: true })
  principal: string | null;

  @Column({ name: "bonus_share", type: "varchar", length: 78, nullable: true })
  bonusShare: string | null;
}

@Entity({ name: "claim_corrupted", schema: "battlechainindexer_confidence_pool" })
export class ClaimCorruptedEvent extends BasePoolEvent {
  @Column({ name: "caller", type: "char", length: 42, nullable: true })
  caller: string | null;

  @Column({ name: "recovery_address", type: "char", length: 42, nullable: true })
  recoveryAddress: string | null;

  @Column({ name: "amount", type: "varchar", length: 78, nullable: true })
  amount: string | null;
}

@Entity({ name: "attacker_bounty_claimed", schema: "battlechainindexer_confidence_pool" })
export class AttackerBountyClaimedEvent extends BasePoolEvent {
  @Column({ name: "attacker", type: "char", length: 42, nullable: true })
  attacker: string | null;

  @Column({ name: "amount", type: "varchar", length: 78, nullable: true })
  amount: string | null;

  @Column({ name: "total_claimed", type: "varchar", length: 78, nullable: true })
  totalClaimed: string | null;

  @Column({ name: "total_entitlement", type: "varchar", length: 78, nullable: true })
  totalEntitlement: string | null;
}
