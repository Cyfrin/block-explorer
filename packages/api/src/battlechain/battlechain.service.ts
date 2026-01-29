import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ContractStateChange } from "./contractState.entity";
import { AgreementCreated } from "./agreement.entity";
import { AgreementScope } from "./agreementScope.entity";
import { AgreementCurrentState } from "./agreementCurrentState.entity";
import { ContractState, ContractStateInfoDto, AgreementDto, IdentityRequirement } from "./battlechain.dto";
import { PROMOTION_WINDOW_MS, PROMOTION_DELAY_MS } from "./battlechain.constants";

@Injectable()
export class BattlechainService {
  private readonly logger = new Logger(BattlechainService.name);

  private readonly identityMap: IdentityRequirement[] = ["Anonymous", "Pseudonymous", "Named"];

  constructor(
    @InjectRepository(ContractStateChange)
    private readonly contractStateRepository: Repository<ContractStateChange>,
    @InjectRepository(AgreementCreated)
    private readonly agreementCreatedRepository: Repository<AgreementCreated>,
    @InjectRepository(AgreementScope)
    private readonly agreementScopeRepository: Repository<AgreementScope>,
    @InjectRepository(AgreementCurrentState)
    private readonly agreementStateRepository: Repository<AgreementCurrentState>
  ) {}

  /**
   * Get the current state info for a contract by analyzing its state change history.
   * Returns NOT_REGISTERED state if contract is not found in the AttackRegistry.
   */
  async getContractStateInfo(contractAddress: string): Promise<ContractStateInfoDto> {
    const normalizedAddress = contractAddress.toLowerCase();

    // Get all state changes for this contract, ordered by block number
    const stateChanges = await this.contractStateRepository.find({
      where: { contractAddress: normalizedAddress },
      order: { blockNumber: "ASC", logIndex: "ASC" },
    });

    // If no state changes found, contract is not registered in the AttackRegistry
    if (stateChanges.length === 0) {
      return {
        state: "NOT_REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
        underAttackAt: null,
        productionAt: null,
      };
    }

    // Process state changes to build the state info
    let currentState = ContractState.NEW_DEPLOYMENT;
    let wasUnderAttack = false;
    let registeredAt: number | null = null;
    let underAttackAt: number | null = null;
    let productionAt: number | null = null;
    let attackRequestedAt: number | null = null;
    let promotionRequestedAt: number | null = null;
    let corruptedAt: number | null = null;

    for (const change of stateChanges) {
      const timestamp = change.blockTimestamp ? change.blockTimestamp.getTime() : null;

      switch (change.newState) {
        case ContractState.NOT_DEPLOYED:
          currentState = ContractState.NOT_DEPLOYED;
          break;
        case ContractState.NEW_DEPLOYMENT:
          currentState = ContractState.NEW_DEPLOYMENT;
          if (!registeredAt) {
            registeredAt = timestamp;
          }
          break;
        case ContractState.ATTACK_REQUESTED:
          currentState = ContractState.ATTACK_REQUESTED;
          attackRequestedAt = timestamp;
          break;
        case ContractState.UNDER_ATTACK:
          currentState = ContractState.UNDER_ATTACK;
          wasUnderAttack = true;
          underAttackAt = timestamp;
          break;
        case ContractState.PROMOTION_REQUESTED:
          currentState = ContractState.PROMOTION_REQUESTED;
          promotionRequestedAt = timestamp;
          break;
        case ContractState.PRODUCTION:
          currentState = ContractState.PRODUCTION;
          productionAt = timestamp;
          break;
        case ContractState.CORRUPTED:
          currentState = ContractState.CORRUPTED;
          corruptedAt = timestamp;
          break;
      }
    }

    // Calculate promotion window end timestamp based on current state
    let promotionWindowEnds: number | null = null;
    if (currentState === ContractState.NEW_DEPLOYMENT && registeredAt) {
      // 14-day auto-promotion window from registration
      promotionWindowEnds = registeredAt + PROMOTION_WINDOW_MS;
    } else if (currentState === ContractState.ATTACK_REQUESTED && attackRequestedAt) {
      // Still within 14-day window from registration
      promotionWindowEnds = registeredAt ? registeredAt + PROMOTION_WINDOW_MS : null;
    } else if (currentState === ContractState.UNDER_ATTACK && registeredAt) {
      // 14-day window from registration (contract is attackable)
      promotionWindowEnds = registeredAt + PROMOTION_WINDOW_MS;
    } else if (currentState === ContractState.PROMOTION_REQUESTED && promotionRequestedAt) {
      // 3-day delay from promotion request
      promotionWindowEnds = promotionRequestedAt + PROMOTION_DELAY_MS;
    }

    const stateNames: Record<number, string> = {
      [ContractState.NOT_REGISTERED]: "NOT_REGISTERED",
      [ContractState.NOT_DEPLOYED]: "NOT_DEPLOYED",
      [ContractState.NEW_DEPLOYMENT]: "NEW_DEPLOYMENT",
      [ContractState.ATTACK_REQUESTED]: "ATTACK_REQUESTED",
      [ContractState.UNDER_ATTACK]: "UNDER_ATTACK",
      [ContractState.PROMOTION_REQUESTED]: "PROMOTION_REQUESTED",
      [ContractState.PRODUCTION]: "PRODUCTION",
      [ContractState.CORRUPTED]: "CORRUPTED",
    };

    return {
      state: stateNames[currentState] || "NOT_REGISTERED",
      wasUnderAttack,
      registeredAt,
      underAttackAt,
      productionAt,
      attackRequestedAt,
      promotionRequestedAt,
      corruptedAt,
      promotionWindowEnds,
    };
  }

  /**
   * Map AgreementCurrentState entity to AgreementDto
   */
  private mapStateToDto(state: AgreementCurrentState): AgreementDto {
    return {
      agreementAddress: state.agreementAddress,
      owner: state.owner,
      protocolName: state.protocolName ?? undefined,
      agreementUri: state.agreementUri ?? undefined,
      bountyPercentage: state.bountyPercentage ? Number(state.bountyPercentage) : undefined,
      bountyCapUsd: state.bountyCapUsd ?? undefined,
      retainable: state.retainable ?? undefined,
      identityRequirement: state.identityRequirement != null ? this.identityMap[state.identityRequirement] : undefined,
      diligenceRequirements: state.diligenceRequirements ?? undefined,
      aggregateBountyCapUsd: state.aggregateBountyCapUsd ?? undefined,
      contactDetails: state.contactDetails ?? undefined,
      commitmentDeadline: state.commitmentDeadline ? Number(state.commitmentDeadline) * 1000 : undefined,
      coveredContracts: state.coveredContracts ?? [],
      createdAtBlock: state.createdAtBlock,
      createdAt: state.createdAt ? state.createdAt.getTime() : null,
    };
  }

  /**
   * Get agreement by its address.
   * Uses the materialized agreement_current_state table for single-query lookup.
   */
  async getAgreement(agreementAddress: string): Promise<AgreementDto | null> {
    const normalizedAddress = agreementAddress.toLowerCase();

    const state = await this.agreementStateRepository.findOne({
      where: { agreementAddress: normalizedAddress },
    });

    if (!state) {
      return null;
    }

    return this.mapStateToDto(state);
  }

  /**
   * Get the agreement covering a specific contract address.
   * Uses the GIN index on covered_contracts for efficient array contains query.
   */
  async getAgreementByContract(contractAddress: string): Promise<AgreementDto | null> {
    const normalizedAddress = contractAddress.toLowerCase();

    // Use GIN index for array contains query
    const state = await this.agreementStateRepository
      .createQueryBuilder("state")
      .where(":address = ANY(state.covered_contracts)", { address: normalizedAddress })
      .getOne();

    if (!state) {
      return null;
    }

    return this.mapStateToDto(state);
  }

  /**
   * Get all agreements.
   * Uses the materialized agreement_current_state table for efficient retrieval.
   */
  async getAllAgreements(): Promise<AgreementDto[]> {
    const states = await this.agreementStateRepository.find({
      order: { createdAtBlock: "DESC" },
    });

    return states.map((state) => this.mapStateToDto(state));
  }
}
