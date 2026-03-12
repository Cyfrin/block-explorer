import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// Contract states aligned with AttackRegistry.sol
export enum ContractState {
  NOT_REGISTERED = -1, // Frontend-only: Contract not found in AttackRegistry
  NOT_DEPLOYED = 0, // Contract not deployed via BattleChainDeployer
  NEW_DEPLOYMENT = 1, // Just deployed, no attack requested yet (display: "Registered")
  ATTACK_REQUESTED = 2, // Waiting DAO approval (display: "Warming Up")
  UNDER_ATTACK = 3, // Open for ethical hacking (display: "Attackable")
  PROMOTION_REQUESTED = 4, // Owner requested promotion, 3-day delay (display: "Promotion Pending")
  PRODUCTION = 5, // Protected, no longer attackable (display: "Production")
  CORRUPTED = 6, // Marked corrupted after successful attack (display: "Compromised")
}

export class ContractStateInfoDto {
  @ApiProperty({
    description: "Current state of the contract",
    enum: [
      "NOT_REGISTERED",
      "NOT_DEPLOYED",
      "NEW_DEPLOYMENT",
      "ATTACK_REQUESTED",
      "UNDER_ATTACK",
      "PROMOTION_REQUESTED",
      "PRODUCTION",
      "CORRUPTED",
    ],
    example: "NEW_DEPLOYMENT",
  })
  state: string;

  @ApiProperty({
    description: "Whether the contract was ever under attack",
    example: false,
  })
  wasUnderAttack: boolean;

  @ApiPropertyOptional({
    description: "Unix timestamp in milliseconds when the contract was registered in the AttackRegistry",
    example: 1704067200000,
  })
  registeredAt: number | null;

  @ApiPropertyOptional({
    description: "Unix timestamp in milliseconds when the contract went under attack",
    example: null,
  })
  underAttackAt: number | null;

  @ApiPropertyOptional({
    description: "Unix timestamp in milliseconds when the contract reached production",
    example: null,
  })
  productionAt: number | null;

  @ApiPropertyOptional({
    description: "Unix timestamp in milliseconds when attack mode was requested",
    example: null,
  })
  attackRequestedAt?: number | null;

  @ApiPropertyOptional({
    description: "Transaction hash of the attack request",
    example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  })
  attackRequestedTxHash?: string | null;

  @ApiPropertyOptional({
    description: "Transaction hash when the agreement was registered (NEW_DEPLOYMENT)",
    example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  })
  registeredTxHash?: string | null;

  @ApiPropertyOptional({
    description: "Transaction hash when the contract went under attack",
    example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  })
  underAttackTxHash?: string | null;

  @ApiPropertyOptional({
    description: "Unix timestamp in milliseconds when promotion was requested",
    example: null,
  })
  promotionRequestedAt?: number | null;

  @ApiPropertyOptional({
    description: "Transaction hash when promotion was requested",
    example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  })
  promotionRequestedTxHash?: string | null;

  @ApiPropertyOptional({
    description: "Unix timestamp in milliseconds when contract was marked corrupted",
    example: null,
  })
  corruptedAt?: number | null;

  @ApiPropertyOptional({
    description: "Transaction hash when the contract was marked corrupted",
    example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  })
  corruptedTxHash?: string | null;

  @ApiPropertyOptional({
    description: "Transaction hash when the contract reached production",
    example: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  })
  productionTxHash?: string | null;

  @ApiPropertyOptional({
    description: "Unix timestamp in milliseconds when auto-promotion will occur (14-day window from registration, or 3-day delay from promotion request)",
    example: null,
  })
  promotionWindowEnds?: number | null;

  @ApiPropertyOptional({
    description: "Unix timestamp in milliseconds until which agreement terms are locked (from the covering agreement)",
    example: 1735689600000,
  })
  commitmentLockedUntil?: number | null;

  @ApiPropertyOptional({
    description: "Details about the attack if the contract was compromised",
  })
  attackDetails?: {
    attackerAddress?: string;
    attackRegisteredAt?: number;
    attackType?: string;
  };
}

export type IdentityRequirement = "Anonymous" | "Pseudonymous" | "Named";

export class ContactDetailDto {
  @ApiProperty({
    description: "Name/label for the contact method",
    example: "Security Team",
  })
  name: string;

  @ApiProperty({
    description: "Contact information (email, phone, telegram handle, etc.)",
    example: "security@protocol.com",
  })
  contact: string;
}

export class CoveredAccountDto {
  @ApiProperty({
    description: "Contract/account address",
    example: "0x1234567890123456789012345678901234567890",
  })
  accountAddress: string;

  @ApiProperty({
    description: "Child contract scope (0=None, 1=ExistingOnly, 2=All, 3=FutureOnly)",
    enum: [0, 1, 2, 3],
    example: 0,
  })
  childContractScope: number;
}

export class AgreementDto {
  @ApiProperty({
    description: "Address of the agreement contract",
    example: "0x1234567890123456789012345678901234567890",
  })
  agreementAddress: string;

  @ApiProperty({
    description: "Address of the agreement owner",
    example: "0x0987654321098765432109876543210987654321",
  })
  owner: string;

  @ApiPropertyOptional({
    description: "Current state of the agreement (from AttackRegistry)",
    enum: ["NOT_REGISTERED", "NEW_DEPLOYMENT", "ATTACK_REQUESTED", "UNDER_ATTACK", "PROMOTION_REQUESTED", "PRODUCTION", "CORRUPTED"],
    example: "NEW_DEPLOYMENT",
  })
  state?: string;

  @ApiPropertyOptional({
    description: "Name of the protocol",
    example: "Uniswap V3",
  })
  protocolName?: string;

  @ApiPropertyOptional({
    description: "URI to the full agreement document (IPFS, Arweave, or HTTP)",
    example: "ipfs://QmXyz123...",
  })
  agreementUri?: string;

  @ApiPropertyOptional({
    description: "Bounty percentage (0-100) offered to whitehats",
    example: 10,
  })
  bountyPercentage?: number;

  @ApiPropertyOptional({
    description: "Maximum bounty cap in USD (raw value, divide by 1e6 for display)",
    example: "5000000",
  })
  bountyCapUsd?: string;

  @ApiPropertyOptional({
    description: "Whether whitehats can retain funds beyond the bounty",
    example: false,
  })
  retainable?: boolean;

  @ApiPropertyOptional({
    description: "Identity requirement for whitehats",
    enum: ["Anonymous", "Pseudonymous", "Named"],
    example: "Anonymous",
  })
  identityRequirement?: IdentityRequirement;

  @ApiPropertyOptional({
    description: "Diligence requirements for Named whitehats",
    example: "Must provide KYC documentation",
  })
  diligenceRequirements?: string;

  @ApiPropertyOptional({
    description: "Aggregate bounty cap across all whitehats in USD (0 = no cap)",
    example: "10000000",
  })
  aggregateBountyCapUsd?: string;

  @ApiPropertyOptional({
    description: "Contact details for reaching the protocol team",
    type: [ContactDetailDto],
    example: [{ name: "Security Team", contact: "security@protocol.com" }],
  })
  contactDetails?: ContactDetailDto[];

  @ApiPropertyOptional({
    description: "Unix timestamp in milliseconds until which agreement terms are locked",
    example: 1735689600000,
  })
  commitmentDeadline?: number;

  @ApiPropertyOptional({
    description: "List of contract addresses covered by this agreement",
    type: [String],
    example: ["0x1111111111111111111111111111111111111111"],
  })
  coveredContracts?: string[];

  @ApiPropertyOptional({
    description: "List of covered accounts with their child contract scopes",
    type: [CoveredAccountDto],
  })
  coveredAccounts?: CoveredAccountDto[];

  @ApiProperty({
    description: "Block number when the agreement was created",
    example: 12345678,
  })
  createdAtBlock: number;

  @ApiPropertyOptional({
    description: "Timestamp in milliseconds when the agreement was created",
    example: 1704067200000,
  })
  createdAt: number | null;
}

export class AgreementByContractDto {
  @ApiProperty({
    description: "Agreements covering this contract",
    type: [AgreementDto],
  })
  agreements: AgreementDto[];

  @ApiProperty({
    description: "Whether the contract is covered by at least one agreement",
    example: true,
  })
  hasCoverage: boolean;

  @ApiProperty({
    description: "True if the queried address IS an agreement contract itself (not just covered by one)",
    example: false,
  })
  isAgreementContract: boolean;
}

export class AuthorizedOwnerDto {
  @ApiPropertyOptional({
    description: "The authorized owner address. Null if contract was not deployed via BattleChainDeployer.",
    example: "0x1234567890123456789012345678901234567890",
  })
  authorizedOwner: string | null;

  @ApiProperty({
    description: "Whether the contract was deployed via BattleChainDeployer",
    example: true,
  })
  isDeployedViaBattleChain: boolean;
}

export class AuthorizedOwnersResponseDto {
  [contractAddress: string]: AuthorizedOwnerDto;
}

export class AttackModeratorDto {
  @ApiProperty({
    description: "The current attack moderator address for this agreement",
    example: "0x1234567890123456789012345678901234567890",
  })
  attackModerator: string;

  @ApiProperty({
    description: "Whether the attack moderator was transferred from the original owner",
    example: false,
  })
  wasTransferred: boolean;
}

export class PaginationMetaDto {
  @ApiProperty({ description: "Current page number (1-indexed)", example: 1 })
  currentPage: number;

  @ApiProperty({ description: "Number of items in the current response", example: 10 })
  itemCount: number;

  @ApiProperty({ description: "Number of items per page", example: 10 })
  itemsPerPage: number;

  @ApiProperty({ description: "Total number of items", example: 42 })
  totalItems: number;

  @ApiProperty({ description: "Total number of pages", example: 5 })
  totalPages: number;
}

export class PaginatedAgreementsDto {
  @ApiProperty({ type: [AgreementDto], description: "Array of agreement items" })
  items: AgreementDto[];

  @ApiProperty({ type: PaginationMetaDto, description: "Pagination metadata" })
  meta: PaginationMetaDto;
}
