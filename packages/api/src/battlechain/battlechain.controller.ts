import { Controller, Get, Post, Param, Body, Query, NotFoundException } from "@nestjs/common";
import {
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from "@nestjs/swagger";
// Note: NotFoundException still used for agreement endpoints
import { BattlechainService } from "./battlechain.service";
import {
  ContractStateInfoDto,
  AgreementDto,
  AgreementByContractDto,
  AuthorizedOwnerDto,
  AuthorizedOwnersResponseDto,
  AttackModeratorDto,
  PaginatedAgreementsDto,
} from "./battlechain.dto";
import { ParseAddressPipe } from "../common/pipes/parseAddress.pipe";

@ApiTags("BattleChain")
@Controller("battlechain")
export class BattlechainController {
  constructor(private readonly battlechainService: BattlechainService) {}

  @Get("contract-state/:address")
  @ApiParam({
    name: "address",
    type: "string",
    description: "Contract address",
    example: "0x1234567890123456789012345678901234567890",
  })
  @ApiOkResponse({
    description:
      "Contract state info returned successfully. Returns NOT_REGISTERED state if contract is not in AttackRegistry.",
    type: ContractStateInfoDto,
  })
  @ApiBadRequestResponse({ description: "Invalid address format" })
  async getContractState(@Param("address", new ParseAddressPipe()) address: string): Promise<ContractStateInfoDto> {
    // Always returns a response - NOT_REGISTERED if contract not found in AttackRegistry
    return await this.battlechainService.getContractStateInfo(address);
  }

  @Get("agreement/:address")
  @ApiParam({
    name: "address",
    type: "string",
    description: "Agreement contract address",
    example: "0x1234567890123456789012345678901234567890",
  })
  @ApiOkResponse({
    description: "Agreement details returned successfully",
    type: AgreementDto,
  })
  @ApiBadRequestResponse({ description: "Invalid address format" })
  @ApiNotFoundResponse({ description: "Agreement not found" })
  async getAgreement(@Param("address", new ParseAddressPipe()) address: string): Promise<AgreementDto> {
    const agreement = await this.battlechainService.getAgreement(address);
    if (!agreement) {
      throw new NotFoundException("Agreement not found");
    }
    return agreement;
  }

  @Get("agreement/by-contract/:contractAddress")
  @ApiParam({
    name: "contractAddress",
    type: "string",
    description: "Contract address to find coverage for",
    example: "0x1234567890123456789012345678901234567890",
  })
  @ApiOkResponse({
    description: "Agreement coverage info returned successfully",
    type: AgreementByContractDto,
  })
  @ApiBadRequestResponse({ description: "Invalid address format" })
  async getAgreementByContract(
    @Param("contractAddress", new ParseAddressPipe()) contractAddress: string
  ): Promise<AgreementByContractDto> {
    const { agreements, isAgreementContract } =
      await this.battlechainService.getAgreementInfoForContract(contractAddress);
    return {
      agreements,
      hasCoverage: agreements.length > 0,
      isAgreementContract,
    };
  }

  @Get("agreements")
  @ApiQuery({
    name: "state",
    required: false,
    enum: ["NEW_DEPLOYMENT", "ATTACK_REQUESTED", "UNDER_ATTACK", "PROMOTION_REQUESTED", "PRODUCTION", "CORRUPTED"],
    description: "Filter agreements by state",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (1-indexed, default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 10, max: 100)",
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    enum: ["protocolName", "state", "bountyPercentage", "bountyCapUsd", "createdAt"],
    description: "Field to sort by (default: createdAt)",
  })
  @ApiQuery({
    name: "sortOrder",
    required: false,
    enum: ["ASC", "DESC"],
    description: "Sort order (default: DESC)",
  })
  @ApiOkResponse({
    description: "Paginated list of agreements returned successfully",
    type: PaginatedAgreementsDto,
  })
  async getAllAgreements(
    @Query("state") state?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC"
  ): Promise<PaginatedAgreementsDto> {
    return await this.battlechainService.getAllAgreements(
      state,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder
    );
  }

  @Get("authorized-owner/:contractAddress")
  @ApiParam({
    name: "contractAddress",
    type: "string",
    description: "Contract address to check authorization for",
    example: "0x1234567890123456789012345678901234567890",
  })
  @ApiOkResponse({
    description:
      "Returns the authorized owner address. If null, the contract was not deployed via BattleChainDeployer.",
    type: AuthorizedOwnerDto,
  })
  @ApiBadRequestResponse({ description: "Invalid address format" })
  async getAuthorizedOwner(
    @Param("contractAddress", new ParseAddressPipe()) contractAddress: string
  ): Promise<AuthorizedOwnerDto> {
    const authorizedOwner = await this.battlechainService.getAuthorizedOwner(contractAddress);
    return {
      authorizedOwner,
      isDeployedViaBattleChain: authorizedOwner !== null,
    };
  }

  @Post("authorized-owners")
  @ApiBody({
    description: "Array of contract addresses to check authorization for",
    type: [String],
    examples: {
      example1: {
        value: ["0x1234567890123456789012345678901234567890", "0xabcdef1234567890abcdef1234567890abcdef12"],
      },
    },
  })
  @ApiOkResponse({
    description: "Returns authorized owners for multiple contracts",
    type: AuthorizedOwnersResponseDto,
  })
  async getAuthorizedOwners(@Body() contractAddresses: string[]): Promise<AuthorizedOwnersResponseDto> {
    const results = await this.battlechainService.getAuthorizedOwners(contractAddresses);
    const response: AuthorizedOwnersResponseDto = {};

    for (const [address, owner] of Object.entries(results)) {
      response[address] = {
        authorizedOwner: owner,
        isDeployedViaBattleChain: owner !== null,
      };
    }

    return response;
  }

  @Get("attack-moderator/:agreementAddress")
  @ApiParam({
    name: "agreementAddress",
    type: "string",
    description: "Agreement address to get the attack moderator for",
    example: "0x1234567890123456789012345678901234567890",
  })
  @ApiOkResponse({
    description:
      "Returns the current attack moderator for the agreement. The attack moderator can call promote() and cancelPromotion().",
    type: AttackModeratorDto,
  })
  @ApiBadRequestResponse({ description: "Invalid address format" })
  @ApiNotFoundResponse({ description: "Agreement not found" })
  async getAttackModerator(
    @Param("agreementAddress", new ParseAddressPipe()) agreementAddress: string
  ): Promise<AttackModeratorDto> {
    const result = await this.battlechainService.getAttackModerator(agreementAddress);
    if (!result) {
      throw new NotFoundException("Agreement not found");
    }
    return result;
  }
}
