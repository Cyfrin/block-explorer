import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";

/**
 * Entity representing a covered account within an agreement.
 * Stores the account address and its child contract scope setting.
 *
 * Maps to: battlechainindexer_agreement.agreement_accounts
 */
@Entity({ name: "agreement_accounts", schema: "battlechainindexer_agreement" })
export class AgreementAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: "agreement_address", type: "char", length: 42 })
  agreementAddress: string;

  @Column({ name: "caip2_chain_id", type: "varchar", length: 100 })
  caip2ChainId: string;

  @Column({ name: "account_address", type: "varchar", length: 100 })
  accountAddress: string;

  @Column({ name: "child_contract_scope", type: "smallint", default: 0 })
  childContractScope: number; // 0=None, 1=ExistingOnly, 2=All, 3=FutureOnly

  @Column({ name: "created_at", type: "timestamptz", nullable: true })
  createdAt: Date | null;

  @Column({ name: "updated_at", type: "timestamptz", nullable: true })
  updatedAt: Date | null;
}
