import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";

/**
 * Entity representing the scope of an agreement - which contracts are covered by it.
 * This table is used for development seeding and will eventually be populated
 * by indexing BattlechainScopeAddressAdded/Removed events from Agreement contracts.
 */
@Entity({ name: "agreement_scope", schema: "battlechainindexer_agreement_factory" })
export class AgreementScope {
  @PrimaryGeneratedColumn()
  public readonly id: number;

  @Column({ name: "agreement_address", type: "char", length: 42 })
  @Index()
  public readonly agreementAddress: string;

  @Column({ name: "contract_address", type: "char", length: 42 })
  @Index()
  public readonly contractAddress: string;
}
