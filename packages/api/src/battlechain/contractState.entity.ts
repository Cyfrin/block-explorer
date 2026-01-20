import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { hexTransformer } from "../common/transformers/hex.transformer";
import { bigIntNumberTransformer } from "../common/transformers/bigIntNumber.transformer";

/**
 * Entity representing a contract state change event from the AttackRegistry contract.
 * This maps to the table created by rindexer: battlechain.attackregistry_contractstatechanged
 *
 * ContractState enum values:
 * 0 = NEW_DEPLOYMENT
 * 1 = UNDER_ATTACK
 * 2 = PRODUCTION
 */
@Entity({ name: "attackregistry_contractstatechanged", schema: "battlechain" })
export class ContractStateChange {
  @PrimaryColumn({ name: "rindexer_id", type: "varchar" })
  public readonly rindexerId: string;

  @Column({ name: "contract_address", type: "bytea", transformer: hexTransformer })
  @Index()
  public readonly contractAddress: string;

  @Column({ name: "new_state", type: "smallint" })
  public readonly newState: number;

  @Column({ name: "tx_hash", type: "bytea", transformer: hexTransformer })
  public readonly txHash: string;

  @Column({ name: "block_number", type: "bigint", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @Column({ name: "log_index", type: "int" })
  public readonly logIndex: number;

  @Column({ name: "block_timestamp", type: "timestamp", nullable: true })
  public readonly blockTimestamp: Date | null;
}
