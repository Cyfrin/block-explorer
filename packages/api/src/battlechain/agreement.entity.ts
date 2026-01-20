import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { hexTransformer } from "../common/transformers/hex.transformer";
import { bigIntNumberTransformer } from "../common/transformers/bigIntNumber.transformer";

/**
 * Entity representing an agreement created event from the AgreementFactory contract.
 * This maps to the table created by rindexer: battlechain.agreementfactory_agreementcreated
 */
@Entity({ name: "agreementfactory_agreementcreated", schema: "battlechain" })
export class AgreementCreated {
  @PrimaryColumn({ name: "rindexer_id", type: "varchar" })
  public readonly rindexerId: string;

  @Column({ name: "agreement_address", type: "bytea", transformer: hexTransformer })
  @Index()
  public readonly agreementAddress: string;

  @Column({ name: "owner", type: "bytea", transformer: hexTransformer })
  @Index()
  public readonly owner: string;

  @Column({ name: "salt", type: "bytea", transformer: hexTransformer })
  public readonly salt: string;

  @Column({ name: "tx_hash", type: "bytea", transformer: hexTransformer })
  public readonly txHash: string;

  @Column({ name: "block_number", type: "bigint", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @Column({ name: "log_index", type: "int" })
  public readonly logIndex: number;

  @Column({ name: "block_timestamp", type: "timestamp", nullable: true })
  public readonly blockTimestamp: Date | null;
}

/**
 * Entity representing a contract being added to an agreement's scope.
 * This maps to the table: battlechain.agreement_battlechainscopeaddressadded
 */
@Entity({ name: "agreement_battlechainscopeaddressadded", schema: "battlechain" })
export class AgreementScopeAddressAdded {
  @PrimaryColumn({ name: "rindexer_id", type: "varchar" })
  public readonly rindexerId: string;

  @Column({ name: "addr", type: "bytea", transformer: hexTransformer })
  @Index()
  public readonly addr: string;

  @Column({ name: "tx_hash", type: "bytea", transformer: hexTransformer })
  public readonly txHash: string;

  @Column({ name: "block_number", type: "bigint", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @Column({ name: "log_index", type: "int" })
  public readonly logIndex: number;

  @Column({ name: "block_timestamp", type: "timestamp", nullable: true })
  public readonly blockTimestamp: Date | null;

  // The contract that emitted this event (the Agreement contract address)
  @Column({ name: "contract_address", type: "bytea", transformer: hexTransformer, nullable: true })
  public readonly contractAddress: string | null;
}

/**
 * Entity representing a contract being removed from an agreement's scope.
 * This maps to the table: battlechain.agreement_battlechainscopeaddressremoved
 */
@Entity({ name: "agreement_battlechainscopeaddressremoved", schema: "battlechain" })
export class AgreementScopeAddressRemoved {
  @PrimaryColumn({ name: "rindexer_id", type: "varchar" })
  public readonly rindexerId: string;

  @Column({ name: "addr", type: "bytea", transformer: hexTransformer })
  @Index()
  public readonly addr: string;

  @Column({ name: "tx_hash", type: "bytea", transformer: hexTransformer })
  public readonly txHash: string;

  @Column({ name: "block_number", type: "bigint", transformer: bigIntNumberTransformer })
  public readonly blockNumber: number;

  @Column({ name: "log_index", type: "int" })
  public readonly logIndex: number;

  @Column({ name: "block_timestamp", type: "timestamp", nullable: true })
  public readonly blockTimestamp: Date | null;

  // The contract that emitted this event (the Agreement contract address)
  @Column({ name: "contract_address", type: "bytea", transformer: hexTransformer, nullable: true })
  public readonly contractAddress: string | null;
}
