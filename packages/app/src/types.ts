export type Hash = `0x${string}` | string;

export type Address = Hash;

export type NetworkOrigin = "L1" | "L2";

export enum ContractVerificationCodeFormatEnum {
  soliditySingleFile = "solidity-single-file",
  solidityMultiPart = "solidity-standard-json-input",
  vyperJson = "vyper-json",
}

export type ContractVerificationCodeFormat =
  | ContractVerificationCodeFormatEnum.soliditySingleFile
  | ContractVerificationCodeFormatEnum.solidityMultiPart
  | ContractVerificationCodeFormatEnum.vyperJson;

export enum CompilerEnum {
  solc = "solc",
  vyper = "vyper",
}

export enum CompilationTypeOptionsEnum {
  soliditySingleFile = "soliditySingleFile",
  solidityMultiPart = "solidityMultiPart",
  vyperJson = "vyperJson",
}

export type Compiler = CompilerEnum.solc | CompilerEnum.vyper;

export type ContractVerificationData = {
  codeFormat: ContractVerificationCodeFormat;
  contractAddress: string;
  contractName: string;
  optimizationUsed: boolean;
  optimizerRuns: number;
  sourceCode:
    | string
    | {
        language: string;
        sources: {
          [key: string]: {
            content: string;
          };
        };
        settings: {
          optimizer?: {
            enabled: boolean;
            runs?: number;
          };
        };
      };
  evmVersion: string;
  compilerVersion: string;
  constructorArguments: string;
};

export type ContractVerificationStatus = "successful" | "failed" | "in_progress" | "queued";

export enum TimeFormat {
  TIME_AGO = "time_ago",
  FULL = "full",
  TIME_AGO_AND_FULL = "time_ago_and_full",
}

// Safe Harbor Agreement Types
export type IdentityRequirement = "Anonymous" | "Pseudonymous" | "Named";

export interface ContactDetail {
  name: string;
  contact: string;
}

export interface SafeHarborAgreement {
  // Core identification - the agreement is its own smart contract
  agreementAddress: Address;
  owner?: Address;
  state?: ContractState;
  protocolName?: string;

  // Bounty terms (machine-readable)
  bountyPercentage?: number;
  bountyCapUsd?: string;
  retainable?: boolean;
  identityRequirement?: IdentityRequirement;
  diligenceRequirements?: string;
  aggregateBountyCapUsd?: string;

  // Scope
  coveredContracts: Address[];
  coveredAccounts?: CoveredAccount[];

  // Contacts - new format from API
  contactDetails?: ContactDetail[];

  // Commitment window
  commitmentDeadline?: number;

  // Off-chain reference
  agreementURI?: string;

  // Metadata
  createdAtBlock?: number;
  registeredAt?: number | null;
  lastModified?: number;

  // Value estimation
  valueBand?: string;
  valuePricedUsd?: string;
  valueNativeUsd?: string;
  valuePricedTokens?: Array<{ symbol: string; address: string; usd: number }>;
  valueUnpricedTokens?: Array<{ symbol: string | null; address: string }>;
  valueConfidence?: string;
  valueEstimatedAt?: number;
}

export interface AgreementDocument {
  version: string;
  fullLegalText: string;
  scope: {
    description: string;
    exclusions: string[];
  };
  additionalTerms?: string;
}

// Child contract scope enum - matches contract ChildContractScope
export enum ChildContractScope {
  None = 0, // No child contracts are included
  ExistingOnly = 1, // Only child contracts created before the agreement are included
  All = 2, // All child contracts (past and future) are included
  FutureOnly = 3, // Only child contracts created after the agreement are included
}

// Covered account with child contract scope (returned from API)
export interface CoveredAccount {
  accountAddress: Address;
  childContractScope: ChildContractScope;
}

// Account entry for chain configuration (used in forms)
export interface ChainAccount {
  accountAddress: string;
  childContractScope: ChildContractScope;
}

// Chain configuration for agreement
export interface ChainConfig {
  caip2ChainId: string;
  assetRecoveryAddress: string;
  accounts: ChainAccount[];
}

// Bounty terms for agreement
export interface BountyTerms {
  bountyPercentage: number;
  bountyCapUsd: string;
  retainable: boolean;
  identity: 0 | 1 | 2; // 0=Anonymous, 1=Pseudonymous, 2=Named
  diligenceRequirements: string;
  aggregateBountyCapUsd: string;
}

// Form data for creating a new Safe Harbor Agreement - matches ABI AgreementDetails struct
export interface AgreementFormData {
  protocolName: string;
  contactDetails: ContactDetail[];
  chains: ChainConfig[];
  bountyTerms: BountyTerms;
  agreementURI: string;
}

// Contract states aligned with AttackRegistry.sol
export enum ContractState {
  NOT_REGISTERED = "NOT_REGISTERED", // Frontend-only: Contract not found in AttackRegistry
  NOT_DEPLOYED = "NOT_DEPLOYED", // Contract not deployed via BattleChainDeployer
  NEW_DEPLOYMENT = "NEW_DEPLOYMENT", // Just deployed, no attack requested yet (display: "Registered")
  ATTACK_REQUESTED = "ATTACK_REQUESTED", // Waiting DAO approval (display: "Warming Up")
  UNDER_ATTACK = "UNDER_ATTACK", // Open for ethical hacking (display: "Attackable")
  PROMOTION_REQUESTED = "PROMOTION_REQUESTED", // Owner requested promotion, 3-day delay (display: "Promotion Pending")
  PRODUCTION = "PRODUCTION", // Protected, no longer attackable (display: "Production")
  CORRUPTED = "CORRUPTED", // Marked corrupted after successful attack (display: "Compromised")
}
