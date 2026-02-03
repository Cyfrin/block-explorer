import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { bigIntNumberTransformer } from "../common/transformers/bigIntNumber.transformer";

/**
 * Entity representing an AgreementOwnerAuthorized event from the AttackRegistry contract.
 * This maps to the table created by rindexer: battlechainindexer_attack_registry.agreement_owner_authorized
 *
 * This event is emitted when a contract is deployed via BattleChainDeployer, recording:
 * - The contract address that was deployed
 * - The authorized owner (initially the deployer, can be transferred)
 */
@Entity({ name: "agreement_owner_authorized", schema: "battlechainindexer_attack_registry" })
export class AgreementOwnerAuthorized {
  @PrimaryColumn({ name: "rindexer_id", type: "int" })
  public readonly rindexerId: number;

  @Column({ name: "contract_address", type: "char", length: 42 })
  @Index()
  public readonly contractAddress: string;

  @Column({ name: "authorized_owner", type: "char", length: 42 })
  public readonly authorizedOwner: string;

  @Column({ name: "tx_hash", type: "char", length: 66 })
  public readonly txHash: string;

  @Column({ name: "block_number", type: "numeric", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @Column({ name: "log_index", type: "varchar", length: 78 })
  public readonly logIndex: string;

  @Column({ name: "block_timestamp", type: "timestamptz", nullable: true })
  public readonly blockTimestamp: Date | null;
}
