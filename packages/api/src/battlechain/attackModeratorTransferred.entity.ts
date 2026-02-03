import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { bigIntNumberTransformer } from "../common/transformers/bigIntNumber.transformer";

/**
 * Entity representing an AttackModeratorTransferred event from the AttackRegistry contract.
 * This maps to the table created by rindexer: battlechainindexer_attack_registry.attack_moderator_transferred
 *
 * This event is emitted when the attack moderator for an agreement is transferred.
 * The attack moderator is the address that can call promote() and cancelPromotion().
 *
 * Note: The initial attack moderator (set at registration) equals the Agreement owner
 * at registration time. This event only tracks subsequent transfers.
 */
@Entity({ name: "attack_moderator_transferred", schema: "battlechainindexer_attack_registry" })
export class AttackModeratorTransferred {
  @PrimaryColumn({ name: "rindexer_id", type: "int" })
  public readonly rindexerId: number;

  @Column({ name: "agreement_address", type: "char", length: 42 })
  @Index()
  public readonly agreementAddress: string;

  @Column({ name: "new_moderator", type: "char", length: 42 })
  public readonly newModerator: string;

  @Column({ name: "tx_hash", type: "char", length: 66 })
  public readonly txHash: string;

  @Column({ name: "block_number", type: "numeric", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @Column({ name: "log_index", type: "varchar", length: 78 })
  public readonly logIndex: string;

  @Column({ name: "block_timestamp", type: "timestamptz", nullable: true })
  public readonly blockTimestamp: Date | null;
}
