import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from "@nestjs/swagger";
import { ConfidencePoolService } from "./confidencePool.service";
import {
  ConfidencePoolDto,
  ConfidencePoolSummaryDto,
  PaginatedConfidencePoolsDto,
  PoolStakerDto,
  PoolEventDto,
  POOL_PHASES,
} from "./confidencePool.dto";
import { ParseAddressPipe } from "../../common/pipes/parseAddress.pipe";

@ApiTags("ConfidencePool")
@Controller("battlechain/confidence-pool")
export class ConfidencePoolController {
  constructor(private readonly service: ConfidencePoolService) {}

  @Get(":address")
  @ApiParam({ name: "address", type: "string", description: "Pool clone address" })
  @ApiOkResponse({ type: ConfidencePoolDto })
  @ApiBadRequestResponse({ description: "Invalid address format" })
  @ApiNotFoundResponse({ description: "Pool not found" })
  async getPool(@Param("address", new ParseAddressPipe()) address: string): Promise<ConfidencePoolDto> {
    const pool = await this.service.getPool(address);
    if (!pool) throw new NotFoundException("Pool not found");
    return pool;
  }

  @Get(":address/stakers")
  @ApiParam({ name: "address", type: "string" })
  @ApiOkResponse({ type: [PoolStakerDto] })
  async getStakers(@Param("address", new ParseAddressPipe()) address: string): Promise<PoolStakerDto[]> {
    return this.service.getStakers(address);
  }

  @Get(":address/staker/:stakerAddress")
  @ApiParam({ name: "address", type: "string" })
  @ApiParam({ name: "stakerAddress", type: "string" })
  @ApiOkResponse({ type: PoolStakerDto })
  @ApiNotFoundResponse({ description: "Staker has no position in this pool" })
  async getStaker(
    @Param("address", new ParseAddressPipe()) address: string,
    @Param("stakerAddress", new ParseAddressPipe()) stakerAddress: string
  ): Promise<PoolStakerDto> {
    const staker = await this.service.getStaker(address, stakerAddress);
    if (!staker) throw new NotFoundException("Staker has no position in this pool");
    return staker;
  }

  @Get(":address/events")
  @ApiParam({ name: "address", type: "string" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiOkResponse({
    description:
      "Unioned, most-recent-first event feed. `truncated` indicates older events exist beyond what's returned.",
  })
  async getEvents(
    @Param("address", new ParseAddressPipe()) address: string,
    @Query("limit") limit?: string
  ): Promise<{ events: PoolEventDto[]; truncated: boolean }> {
    return this.service.getEvents(address, { limit: limit ? parseInt(limit, 10) : undefined });
  }
}

@ApiTags("ConfidencePool")
@Controller("battlechain/confidence-pools")
export class ConfidencePoolsController {
  constructor(private readonly service: ConfidencePoolService) {}

  @Get()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "phase", required: false, enum: POOL_PHASES })
  @ApiQuery({ name: "agreement", required: false, type: String })
  @ApiQuery({ name: "stakeToken", required: false, type: String })
  @ApiQuery({
    name: "outcome",
    required: false,
    type: Number,
    description: "0=UNRESOLVED,1=SURVIVED,2=CORRUPTED,3=EXPIRED",
  })
  @ApiOkResponse({ type: PaginatedConfidencePoolsDto })
  async list(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("phase") phase?: string,
    @Query("agreement", new ParseAddressPipe({ required: false })) agreement?: string,
    @Query("stakeToken", new ParseAddressPipe({ required: false })) stakeToken?: string,
    @Query("outcome") outcome?: string
  ): Promise<PaginatedConfidencePoolsDto> {
    if (phase && !POOL_PHASES.includes(phase as (typeof POOL_PHASES)[number])) {
      throw new BadRequestException(`Invalid phase: ${phase}`);
    }
    let outcomeNum: number | undefined;
    if (outcome != null) {
      outcomeNum = parseInt(outcome, 10);
      if (Number.isNaN(outcomeNum) || outcomeNum < 0 || outcomeNum > 3) {
        throw new BadRequestException("outcome must be 0=UNRESOLVED, 1=SURVIVED, 2=CORRUPTED, 3=EXPIRED");
      }
    }
    return this.service.listPools({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      phase,
      agreement,
      stakeToken,
      outcome: outcomeNum,
    });
  }

  @Get("by-agreement/:address")
  @ApiParam({ name: "address", type: "string", description: "Agreement address" })
  @ApiOkResponse({ type: [ConfidencePoolSummaryDto] })
  async byAgreement(@Param("address", new ParseAddressPipe()) address: string): Promise<ConfidencePoolSummaryDto[]> {
    return this.service.listByAgreement(address);
  }

  @Get("by-stake-token/:address")
  @ApiParam({ name: "address", type: "string", description: "ERC-20 stake-token address" })
  @ApiOkResponse({ type: [ConfidencePoolSummaryDto] })
  async byStakeToken(@Param("address", new ParseAddressPipe()) address: string): Promise<ConfidencePoolSummaryDto[]> {
    return this.service.listByStakeToken(address);
  }
}
