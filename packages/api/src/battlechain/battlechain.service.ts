import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ContractStateChange } from "./contractState.entity";
import { AgreementCreated, AgreementScopeAddressAdded, AgreementScopeAddressRemoved } from "./agreement.entity";
import { ContractState, ContractStateInfoDto, AgreementDto } from "./battlechain.dto";

@Injectable()
export class BattlechainService {
  private readonly logger = new Logger(BattlechainService.name);

  constructor(
    @InjectRepository(ContractStateChange)
    private readonly contractStateRepository: Repository<ContractStateChange>,
    @InjectRepository(AgreementCreated)
    private readonly agreementCreatedRepository: Repository<AgreementCreated>,
    @InjectRepository(AgreementScopeAddressAdded)
    private readonly scopeAddedRepository: Repository<AgreementScopeAddressAdded>,
    @InjectRepository(AgreementScopeAddressRemoved)
    private readonly scopeRemovedRepository: Repository<AgreementScopeAddressRemoved>
  ) {}

  /**
   * Get the current state info for a contract by analyzing its state change history
   */
  async getContractStateInfo(contractAddress: string): Promise<ContractStateInfoDto | null> {
    const normalizedAddress = contractAddress.toLowerCase();

    // Get all state changes for this contract, ordered by block number
    const stateChanges = await this.contractStateRepository.find({
      where: { contractAddress: normalizedAddress },
      order: { blockNumber: "ASC", logIndex: "ASC" },
    });

    if (stateChanges.length === 0) {
      return null;
    }

    // Process state changes to build the state info
    let currentState = ContractState.NEW_DEPLOYMENT;
    let wasUnderAttack = false;
    let deployedAt: number | null = null;
    let underAttackAt: number | null = null;
    let productionAt: number | null = null;

    for (const change of stateChanges) {
      const timestamp = change.blockTimestamp ? change.blockTimestamp.getTime() : null;

      switch (change.newState) {
        case ContractState.NEW_DEPLOYMENT:
          currentState = ContractState.NEW_DEPLOYMENT;
          if (!deployedAt) {
            deployedAt = timestamp;
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
      }
    }

    const stateNames = ["NEW_DEPLOYMENT", "UNDER_ATTACK", "PRODUCTION"];

    return {
      state: stateNames[currentState] || "NEW_DEPLOYMENT",
      wasUnderAttack,
      deployedAt,
      underAttackAt,
      productionAt,
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

    // Get covered contracts for this agreement
    const coveredContracts = await this.getCoveredContracts(normalizedAddress);

    return {
      agreementAddress: agreement.agreementAddress,
      owner: agreement.owner,
      coveredContracts,
      createdAtBlock: agreement.blockNumber,
      createdAt: agreement.blockTimestamp ? agreement.blockTimestamp.getTime() : null,
    };
  }

  /**
   * Get the agreement covering a specific contract address
   */
  async getAgreementByContract(contractAddress: string): Promise<AgreementDto | null> {
    const normalizedAddress = contractAddress.toLowerCase();

    // Find if this contract was added to any agreement's scope
    // We need to check if it was added and not subsequently removed
    const addedEvents = await this.scopeAddedRepository.find({
      where: { addr: normalizedAddress },
      order: { blockNumber: "DESC", logIndex: "DESC" },
    });

    if (addedEvents.length === 0) {
      return null;
    }

    // For each agreement that added this contract, check if it was later removed
    for (const added of addedEvents) {
      if (!added.contractAddress) continue;

      const removed = await this.scopeRemovedRepository.findOne({
        where: {
          addr: normalizedAddress,
          contractAddress: added.contractAddress,
        },
        order: { blockNumber: "DESC", logIndex: "DESC" },
      });

      // If no removal, or the removal happened before the addition, the contract is covered
      if (!removed || removed.blockNumber < added.blockNumber) {
        // Found an active coverage, get the agreement details
        return await this.getAgreement(added.contractAddress);
      }
    }

    return null;
  }

  /**
   * Get all contracts currently covered by an agreement
   */
  private async getCoveredContracts(agreementAddress: string): Promise<string[]> {
    // Get all addresses ever added to this agreement
    const addedEvents = await this.scopeAddedRepository.find({
      where: { contractAddress: agreementAddress },
      order: { blockNumber: "ASC", logIndex: "ASC" },
    });

    // Get all addresses removed from this agreement
    const removedEvents = await this.scopeRemovedRepository.find({
      where: { contractAddress: agreementAddress },
      order: { blockNumber: "ASC", logIndex: "ASC" },
    });

    // Build a set of currently covered addresses
    const covered = new Set<string>();

    for (const added of addedEvents) {
      covered.add(added.addr.toLowerCase());
    }

    for (const removed of removedEvents) {
      covered.delete(removed.addr.toLowerCase());
    }

    return Array.from(covered);
  }

  /**
   * Get all agreements
   */
  async getAllAgreements(): Promise<AgreementDto[]> {
    const agreements = await this.agreementCreatedRepository.find({
      order: { blockNumber: "DESC" },
    });

    return Promise.all(
      agreements.map(async (agreement) => {
        const coveredContracts = await this.getCoveredContracts(agreement.agreementAddress);
        return {
          agreementAddress: agreement.agreementAddress,
          owner: agreement.owner,
          coveredContracts,
          createdAtBlock: agreement.blockNumber,
          createdAt: agreement.blockTimestamp ? agreement.blockTimestamp.getTime() : null,
        };
      })
    );
  }
}
