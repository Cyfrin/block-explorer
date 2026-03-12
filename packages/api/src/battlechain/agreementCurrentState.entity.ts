import { Entity, Column, PrimaryColumn, Index } from "typeorm";
import { bigIntNumberTransformer } from "../common/transformers/bigIntNumber.transformer";

/**
 * Entity representing the current state of an agreement.
 * This is a materialized/denormalized view that is automatically updated by database triggers
 * whenever agreement events are indexed. This allows single-query lookups instead of
 * joining 6+ event tables.
 *
 * Maps to: battlechainindexer_agreement.agreement_current_state
 */
@Entity({ name: "agreement_current_state", schema: "battlechainindexer_agreement" })
export class AgreementCurrentState {
  @PrimaryColumn({ name: "agreement_address", type: "char", length: 42 })
  agreementAddress: string;

  // From AgreementCreated (via AgreementFactory)
  @Column({ name: "owner", type: "char", length: 42, nullable: true })
  owner: string | null;

  @Column({ name: "created_at_block", type: "numeric", transformer: bigIntNumberTransformer, nullable: true })
  createdAtBlock: number | null;

  @Column({ name: "created_at", type: "timestamptz", nullable: true })
  createdAt: Date | null;

  // From ProtocolNameUpdated
  @Column({ name: "protocol_name", type: "text", nullable: true })
  protocolName: string | null;

  @Column({ name: "protocol_name_updated_at", type: "timestamptz", nullable: true })
  protocolNameUpdatedAt: Date | null;

  // From AgreementURIUpdated
  @Column({ name: "agreement_uri", type: "text", nullable: true })
  agreementUri: string | null;

  @Column({ name: "agreement_uri_updated_at", type: "timestamptz", nullable: true })
  agreementUriUpdatedAt: Date | null;

  // From BountyTermsUpdated
  @Column({ name: "bounty_percentage", type: "numeric", nullable: true })
  bountyPercentage: string | null;

  @Column({ name: "bounty_cap_usd", type: "numeric", nullable: true })
  bountyCapUsd: string | null;

  @Column({ name: "retainable", type: "boolean", nullable: true })
  retainable: boolean | null;

  @Column({ name: "identity_requirement", type: "smallint", nullable: true })
  identityRequirement: number | null; // 0=Anonymous, 1=Pseudonymous, 2=Named

  @Column({ name: "diligence_requirements", type: "text", nullable: true })
  diligenceRequirements: string | null;

  @Column({ name: "aggregate_bounty_cap_usd", type: "numeric", nullable: true })
  aggregateBountyCapUsd: string | null;

  @Column({ name: "bounty_terms_updated_at", type: "timestamptz", nullable: true })
  bountyTermsUpdatedAt: Date | null;

  // From ContactDetailsSet
  @Column({ name: "contact_details", type: "jsonb", nullable: true })
  contactDetails: { name: string; contact: string }[] | null;

  @Column({ name: "contact_details_updated_at", type: "timestamptz", nullable: true })
  contactDetailsUpdatedAt: Date | null;

  // From CommitmentWindowExtended
  @Column({ name: "commitment_deadline", type: "numeric", nullable: true })
  commitmentDeadline: string | null; // Unix timestamp

  @Column({ name: "commitment_deadline_updated_at", type: "timestamptz", nullable: true })
  commitmentDeadlineUpdatedAt: Date | null;

  // From scope events (BattleChainScopeAddressAdded/Removed/Cleared) — manually-specified
  @Column({ name: "covered_scope_contracts", type: "text", array: true, nullable: true })
  coveredScopeContracts: string[] | null;

  // From child contract resolution (computed by polling job)
  @Column({ name: "covered_child_contracts", type: "text", array: true, nullable: true })
  coveredChildContracts: string[] | null;

  // Union of covered_scope_contracts and covered_child_contracts (used for lookups)
  @Column({ name: "covered_contracts", type: "text", array: true, nullable: true })
  @Index()
  coveredContracts: string[] | null;

  @Column({ name: "scope_updated_at", type: "timestamptz", nullable: true })
  scopeUpdatedAt: Date | null;

  // Metadata
  @Column({ name: "last_updated_at", type: "timestamptz", nullable: true })
  lastUpdatedAt: Date | null;

  @Column({ name: "rpc_fetched_at", type: "timestamptz", nullable: true })
  rpcFetchedAt: Date | null;
}
