import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { bigIntNumberTransformer } from "../common/transformers/bigIntNumber.transformer";

/**
 * Entity representing an agreement state change event from the AttackRegistry contract.
 * This maps to the table created by rindexer: battlechainindexer_attack_registry.agreement_state_changed
 *
 * ContractState enum values:
 * 0 = NOT_DEPLOYED
 * 1 = NEW_DEPLOYMENT
 * 2 = ATTACK_REQUESTED
 * 3 = UNDER_ATTACK
 * 4 = PROMOTION_REQUESTED
 * 5 = PRODUCTION
 * 6 = CORRUPTED
 */
@Entity({ name: "agreement_state_changed", schema: "battlechainindexer_attack_registry" })
export class AgreementStateChange {
  @PrimaryColumn({ name: "rindexer_id", type: "int" })
  public readonly rindexerId: number;

  @Column({ name: "agreement_address", type: "char", length: 42, nullable: true })
  @Index()
  public readonly agreementAddress: string | null;

  @Column({ name: "new_state", type: "smallint", nullable: true })
  public readonly newState: number | null;

  @Column({ name: "tx_hash", type: "char", length: 66 })
  public readonly txHash: string;

  @Column({ name: "block_number", type: "numeric", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @Column({ name: "log_index", type: "varchar", length: 78 })
  public readonly logIndex: string;

  @Column({ name: "block_timestamp", type: "timestamptz", nullable: true })
  public readonly blockTimestamp: Date | null;
}
