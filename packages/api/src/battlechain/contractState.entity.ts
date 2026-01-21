import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { bigIntNumberTransformer } from "../common/transformers/bigIntNumber.transformer";

/**
 * Entity representing a contract state change event from the AttackRegistry contract.
 * This maps to the table created by rindexer: battlechainindexer_attack_registry.contract_state_changed
 *
 * ContractState enum values:
 * 0 = REGISTERED (was NEW_DEPLOYMENT)
 * 1 = UNDER_ATTACK
 * 2 = PRODUCTION
 */
@Entity({ name: "contract_state_changed", schema: "battlechainindexer_attack_registry" })
export class ContractStateChange {
  @PrimaryColumn({ name: "rindexer_id", type: "int" })
  public readonly rindexerId: number;

  @Column({ name: "target_contract", type: "char", length: 42, nullable: true })
  @Index()
  public readonly contractAddress: string | null;

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
