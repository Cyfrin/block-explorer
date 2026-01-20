import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { ApiTags, ApiParam, ApiOkResponse, ApiNotFoundResponse, ApiBadRequestResponse } from "@nestjs/swagger";
import { BattlechainService } from "./battlechain.service";
import { ContractStateInfoDto, AgreementDto, AgreementByContractDto } from "./battlechain.dto";
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
    description: "Contract state info returned successfully",
    type: ContractStateInfoDto,
  })
  @ApiBadRequestResponse({ description: "Invalid address format" })
  @ApiNotFoundResponse({ description: "Contract state not found" })
  async getContractState(@Param("address", new ParseAddressPipe()) address: string): Promise<ContractStateInfoDto> {
    const stateInfo = await this.battlechainService.getContractStateInfo(address);
    if (!stateInfo) {
      throw new NotFoundException("Contract state not found");
    }
    return stateInfo;
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
    const agreement = await this.battlechainService.getAgreementByContract(contractAddress);
    return {
      agreement,
      hasCoverage: agreement !== null,
    };
  }

  @Get("agreements")
  @ApiOkResponse({
    description: "List of all agreements returned successfully",
    type: [AgreementDto],
  })
  async getAllAgreements(): Promise<AgreementDto[]> {
    return await this.battlechainService.getAllAgreements();
  }
}
