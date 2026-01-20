import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum ContractState {
  NEW_DEPLOYMENT = 0,
  UNDER_ATTACK = 1,
  PRODUCTION = 2,
}

export class ContractStateInfoDto {
  @ApiProperty({
    description: "Current state of the contract",
    enum: ["NEW_DEPLOYMENT", "UNDER_ATTACK", "PRODUCTION"],
    example: "NEW_DEPLOYMENT",
  })
  state: string;

  @ApiProperty({
    description: "Whether the contract was ever under attack",
    example: false,
  })
  wasUnderAttack: boolean;

  @ApiPropertyOptional({
    description: "Unix timestamp in milliseconds when the contract was deployed",
    example: 1704067200000,
  })
  deployedAt: number | null;

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
    description: "Details about the attack if the contract was attacked",
  })
  attackDetails?: {
    attackerAddress?: string;
    attackRegisteredAt?: number;
    attackType?: string;
  };
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
    description: "List of contract addresses covered by this agreement",
    type: [String],
    example: ["0x1111111111111111111111111111111111111111"],
  })
  coveredContracts?: string[];

  @ApiProperty({
    description: "Block number when the agreement was created",
    example: 12345678,
  })
  createdAtBlock: number;

  @ApiPropertyOptional({
    description: "Timestamp when the agreement was created",
    example: 1704067200000,
  })
  createdAt: number | null;
}

export class AgreementByContractDto {
  @ApiPropertyOptional({
    description: "Agreement covering this contract, if any",
    type: AgreementDto,
  })
  agreement: AgreementDto | null;

  @ApiProperty({
    description: "Whether the contract is covered by an agreement",
    example: true,
  })
  hasCoverage: boolean;
}
