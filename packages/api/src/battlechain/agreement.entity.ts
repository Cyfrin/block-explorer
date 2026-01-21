import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { hexTransformer } from "../common/transformers/hex.transformer";
import { bigIntNumberTransformer } from "../common/transformers/bigIntNumber.transformer";

/**
 * Entity representing an agreement created event from the AgreementFactory contract.
 * This maps to the table created by rindexer: battlechainindexer_agreement_factory.agreement_created
 */
@Entity({ name: "agreement_created", schema: "battlechainindexer_agreement_factory" })
export class AgreementCreated {
  @PrimaryColumn({ name: "rindexer_id", type: "int" })
  public readonly rindexerId: number;

  @Column({ name: "agreement_address", type: "char", length: 42, nullable: true })
  @Index()
  public readonly agreementAddress: string | null;

  @Column({ name: "owner", type: "char", length: 42, nullable: true })
  @Index()
  public readonly owner: string | null;

  @Column({ name: "salt", type: "bytea", transformer: hexTransformer, nullable: true })
  public readonly salt: string | null;

  @Column({ name: "tx_hash", type: "char", length: 66 })
  public readonly txHash: string;

  @Column({ name: "block_number", type: "numeric", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @Column({ name: "log_index", type: "varchar", length: 78 })
  public readonly logIndex: string;

  @Column({ name: "block_timestamp", type: "timestamptz", nullable: true })
  public readonly blockTimestamp: Date | null;
}

// Note: AgreementScopeAddressAdded and AgreementScopeAddressRemoved entities
// will be added when those events are indexed from individual Agreement contracts.
