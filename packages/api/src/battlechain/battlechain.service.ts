import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ContractStateChange } from "./contractState.entity";
import { AgreementCreated } from "./agreement.entity";
import { AgreementScope } from "./agreementScope.entity";
import { ContractState, ContractStateInfoDto, AgreementDto } from "./battlechain.dto";

@Injectable()
export class BattlechainService {
  private readonly logger = new Logger(BattlechainService.name);

  constructor(
    @InjectRepository(ContractStateChange)
    private readonly contractStateRepository: Repository<ContractStateChange>,
    @InjectRepository(AgreementCreated)
    private readonly agreementCreatedRepository: Repository<AgreementCreated>,
    @InjectRepository(AgreementScope)
    private readonly agreementScopeRepository: Repository<AgreementScope>
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
    let currentState = ContractState.REGISTERED;
    let wasUnderAttack = false;
    let registeredAt: number | null = null;
    let underAttackAt: number | null = null;
    let productionAt: number | null = null;
    let attackRequestedAt: number | null = null;

    for (const change of stateChanges) {
      const timestamp = change.blockTimestamp ? change.blockTimestamp.getTime() : null;

      switch (change.newState) {
        case ContractState.REGISTERED:
          currentState = ContractState.REGISTERED;
          if (!registeredAt) {
            registeredAt = timestamp;
          }
          break;
        case ContractState.UNDER_ATTACK:
          currentState = ContractState.UNDER_ATTACK;
          wasUnderAttack = true;
          underAttackAt = timestamp;
          break;
        case ContractState.PRODUCTION:
          currentState = ContractState.PRODUCTION;
          productionAt = timestamp;
          break;
        case ContractState.ATTACK_REQUESTED:
          currentState = ContractState.ATTACK_REQUESTED;
          attackRequestedAt = timestamp;
          break;
      }
    }

    const stateNames: Record<number, string> = {
      [ContractState.NOT_REGISTERED]: "NOT_REGISTERED",
      [ContractState.REGISTERED]: "REGISTERED",
      [ContractState.UNDER_ATTACK]: "UNDER_ATTACK",
      [ContractState.PRODUCTION]: "PRODUCTION",
      [ContractState.ATTACK_REQUESTED]: "ATTACK_REQUESTED",
    };

    return {
      state: stateNames[currentState] || "NOT_REGISTERED",
      wasUnderAttack,
      registeredAt,
      underAttackAt,
      productionAt,
      attackRequestedAt,
    };
  }

  /**
   * Get agreement by its address
   */
  async getAgreement(agreementAddress: string): Promise<AgreementDto | null> {
    const normalizedAddress = agreementAddress.toLowerCase();

    const agreement = await this.agreementCreatedRepository.findOne({
      where: { agreementAddress: normalizedAddress },
    });

    if (!agreement) {
      return null;
    }

    return {
      agreementAddress: agreement.agreementAddress,
      owner: agreement.owner,
      coveredContracts: [], // TODO: Populate when scope events are indexed
      createdAtBlock: agreement.blockNumber,
      createdAt: agreement.blockTimestamp ? agreement.blockTimestamp.getTime() : null,
    };
  }

  /**
   * Get the agreement covering a specific contract address.
   * Queries the agreement_scope table to find which agreement covers this contract.
   */
  async getAgreementByContract(contractAddress: string): Promise<AgreementDto | null> {
    const normalizedAddress = contractAddress.toLowerCase();

    // Find scope entry for this contract
    const scope = await this.agreementScopeRepository.findOne({
      where: { contractAddress: normalizedAddress },
    });

    if (!scope) {
      return null;
    }

    // Get the agreement details
    return this.getAgreement(scope.agreementAddress);
  }

  /**
   * Get all agreements
   */
  async getAllAgreements(): Promise<AgreementDto[]> {
    const agreements = await this.agreementCreatedRepository.find({
      order: { blockNumber: "DESC" },
    });

    return agreements.map((agreement) => ({
      agreementAddress: agreement.agreementAddress,
      owner: agreement.owner,
      coveredContracts: [], // TODO: Populate when scope events are indexed
      createdAtBlock: agreement.blockNumber,
      createdAt: agreement.blockTimestamp ? agreement.blockTimestamp.getTime() : null,
    }));
  }
}
