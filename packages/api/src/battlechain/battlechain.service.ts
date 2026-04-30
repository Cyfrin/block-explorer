import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { JsonRpcProvider, Contract } from "ethers";
import { AgreementStateChange } from "./agreementState.entity";
import { AgreementCurrentState } from "./agreementCurrentState.entity";
import { AgreementAccount } from "./agreementAccount.entity";
import { AgreementOwnerAuthorized } from "./agreementOwnerAuthorized.entity";
import { AttackModeratorTransferred } from "./attackModeratorTransferred.entity";
import {
  ContractState,
  ContractStateInfoDto,
  AgreementDto,
  IdentityRequirement,
  CoveredAccountDto,
  AttackModeratorDto,
  PaginatedAgreementsDto,
} from "./battlechain.dto";
import { PROMOTION_WINDOW_MS, PROMOTION_DELAY_MS } from "./battlechain.constants";
import { ValueEstimationService } from "./valueEstimation/valueEstimation.service";

const AGREEMENT_ABI = [
  "function getDetails() view returns (tuple(string protocolName, tuple(string name, string contact)[] contactDetails, tuple(string assetRecoveryAddress, tuple(string accountAddress, uint8 childContractScope)[] accounts, string caip2ChainId)[] chains, tuple(uint256 bountyPercentage, uint256 bountyCapUsd, bool retainable, uint8 identity, string diligenceRequirements, uint256 aggregateBountyCapUsd) bountyTerms, string agreementURI))",
  "function getCantChangeUntil() view returns (uint256)",
];

const RPC_FETCH_TIMEOUT_MS = 5000;

@Injectable()
export class BattlechainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BattlechainService.name);

  private readonly identityMap: IdentityRequirement[] = ["Anonymous", "Pseudonymous", "Named"];

  private readonly rpcProvider: JsonRpcProvider | null = null;
  private readonly inFlightFetches = new Map<string, Promise<void>>();
  private rpcFetchTimer: NodeJS.Timer = null;
  private childResolutionTimer: NodeJS.Timer = null;
  private static readonly RPC_POLL_INTERVAL_MS = 10_000;
  private static readonly RPC_POLL_BATCH_SIZE = 10;
  private static readonly CHILD_RESOLUTION_INTERVAL_MS = 15_000;
  private static readonly STATE_TRANSITION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  // Recompute TVL for every agreement and write valueBand / valuePricedUsd /
  // valuePricedTokens / valueUnpricedTokens / valueConfidence / valueEstimatedAt
  // back onto agreement_current_state. Freshly-registered agreements show "-"
  // in the UI until the next tick fires.
  private static readonly VALUE_ESTIMATION_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  private stateTransitionTimer: NodeJS.Timer = null;
  private valueEstimationTimer: NodeJS.Timer = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly valueEstimationService: ValueEstimationService,
    @InjectRepository(AgreementStateChange)
    private readonly agreementStateChangeRepository: Repository<AgreementStateChange>,
    @InjectRepository(AgreementCurrentState)
    private readonly agreementStateRepository: Repository<AgreementCurrentState>,
    @InjectRepository(AgreementAccount)
    private readonly agreementAccountRepository: Repository<AgreementAccount>,
    @InjectRepository(AgreementOwnerAuthorized)
    private readonly agreementOwnerAuthorizedRepository: Repository<AgreementOwnerAuthorized>,
    @InjectRepository(AttackModeratorTransferred)
    private readonly attackModeratorTransferredRepository: Repository<AttackModeratorTransferred>
  ) {
    const rpcUrl = this.configService.get<string>("battlechainRpcUrl");
    if (rpcUrl) {
      this.rpcProvider = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
      this.logger.log(`RPC provider configured: ${rpcUrl}`);
    }
  }

  onModuleInit() {
    if (this.rpcProvider) {
      this.rpcFetchTimer = setInterval(
        () => this.fetchPendingAgreementDetails(),
        BattlechainService.RPC_POLL_INTERVAL_MS
      );
      this.logger.log(`RPC polling started (every ${BattlechainService.RPC_POLL_INTERVAL_MS}ms)`);
    }

    this.childResolutionTimer = setInterval(
      () => this.resolveChildContracts(),
      BattlechainService.CHILD_RESOLUTION_INTERVAL_MS
    );
    this.logger.log(
      `Child contract resolution polling started (every ${BattlechainService.CHILD_RESOLUTION_INTERVAL_MS}ms)`
    );

    this.stateTransitionTimer = setInterval(
      () => this.applyTimeBasedStateTransitions(),
      BattlechainService.STATE_TRANSITION_INTERVAL_MS
    );
    this.logger.log(`State transition polling started (every ${BattlechainService.STATE_TRANSITION_INTERVAL_MS}ms)`);

    this.valueEstimationTimer = setInterval(
      () => this.valueEstimationService.estimateAllAgreements(),
      BattlechainService.VALUE_ESTIMATION_INTERVAL_MS
    );
    this.logger.log(`Value estimation polling started (every ${BattlechainService.VALUE_ESTIMATION_INTERVAL_MS}ms)`);
  }

  onModuleDestroy() {
    if (this.rpcFetchTimer) {
      clearInterval(this.rpcFetchTimer);
    }
    if (this.childResolutionTimer) {
      clearInterval(this.childResolutionTimer);
    }
    if (this.stateTransitionTimer) {
      clearInterval(this.stateTransitionTimer);
    }
    if (this.valueEstimationTimer) {
      clearInterval(this.valueEstimationTimer);
    }
  }

  /**
   * Proactively fetch agreement details for agreements that haven't been RPC-fetched yet.
   * Runs on a timer to fill in details shortly after new agreements are indexed.
   */
  private async fetchPendingAgreementDetails(): Promise<void> {
    try {
      const pending = await this.agreementStateRepository
        .createQueryBuilder("state")
        .where("state.rpcFetchedAt IS NULL")
        .take(BattlechainService.RPC_POLL_BATCH_SIZE)
        .getMany();

      if (pending.length === 0) {
        return;
      }

      this.logger.debug(`Fetching RPC details for ${pending.length} pending agreement(s)`);

      for (const state of pending) {
        const address = state.agreementAddress.trim();

        // Skip if already being fetched (e.g. by a concurrent lazy-fetch)
        if (this.inFlightFetches.has(address)) {
          continue;
        }

        const fetchPromise = this.fetchAndStoreDetails(address);
        this.inFlightFetches.set(address, fetchPromise);

        try {
          await fetchPromise;
        } catch (error) {
          this.logger.error({
            message: "Polling: failed to fetch agreement details via RPC",
            stack: (error as Error)?.stack,
            data: { agreementAddress: address },
          });
        } finally {
          this.inFlightFetches.delete(address);
        }
      }
    } catch (error) {
      this.logger.error({
        message: "Polling: failed to query pending agreements",
        stack: (error as Error)?.stack,
      });
    }
  }

  // ChildContractScope enum values (from AgreementTypes.sol)
  private static readonly CHILD_SCOPE_NONE = 0;
  private static readonly CHILD_SCOPE_EXISTING_ONLY = 1;
  private static readonly CHILD_SCOPE_ALL = 2;
  private static readonly CHILD_SCOPE_FUTURE_ONLY = 3;

  /**
   * Apply time-based state transitions that happen without emitting events.
   * Mirrors the smart contract's _getAgreementState() logic:
   * 1. PROMOTION_REQUESTED → PRODUCTION after 3-day delay
   * 2. Auto-promotion → PRODUCTION after 14-day window from registration
   */
  private async applyTimeBasedStateTransitions(): Promise<void> {
    try {
      // 1. Auto-promote PROMOTION_REQUESTED after 3-day delay
      const promotionResult = await this.dataSource.query(
        `UPDATE battlechainindexer_agreement.agreement_current_state
         SET computed_state = 'PRODUCTION', last_updated_at = NOW()
         WHERE computed_state = 'PROMOTION_REQUESTED'
           AND promotion_requested_at IS NOT NULL
           AND NOW() >= promotion_requested_at + INTERVAL '3 days'`
      );

      // 2. Auto-promote after 14-day window
      const windowResult = await this.dataSource.query(
        `UPDATE battlechainindexer_agreement.agreement_current_state
         SET computed_state = 'PRODUCTION', last_updated_at = NOW()
         WHERE computed_state IN ('NEW_DEPLOYMENT', 'ATTACK_REQUESTED')
           AND registered_at IS NOT NULL
           AND NOW() >= registered_at + INTERVAL '14 days'`
      );

      const total = (promotionResult?.[1] || 0) + (windowResult?.[1] || 0);
      if (total > 0) {
        this.logger.log(`Time-based state transitions: ${total} agreement(s) promoted to PRODUCTION`);
      }
    } catch (error) {
      this.logger.error({
        message: "Failed to apply time-based state transitions",
        stack: (error as Error)?.stack,
      });
    }
  }

  /**
   * Incrementally resolve child contracts for agreements that have accounts
   * with childContractScope != None. Two-part process:
   *
   * Part A: Check for newly deployed contracts whose creator is an in-scope address.
   *         Uses a high-water mark (last_processed_block) to only scan new blocks.
   *         Detects factory→child relationships by joining addresses + transactions:
   *         a contract's creatorTxHash links to the transaction whose `to` is the factory.
   *
   * Part B: Process the reindex queue for agreements whose scope has changed.
   *         Does a full recomputation for those specific agreements.
   */
  private async resolveChildContracts(): Promise<void> {
    try {
      await this.resolveChildContractsPartA();
      await this.resolveChildContractsPartB();
    } catch (error) {
      this.logger.error({
        message: "Child contract resolution: unexpected error",
        stack: (error as Error)?.stack,
      });
    }
  }

  /**
   * Part A: Process newly deployed contracts since last_processed_block.
   * Detects factory→child relationships by joining addresses + transactions:
   * when a factory (in-scope address) is called, the transaction's `to` field
   * points to the factory, and any contracts created in that tx have their
   * `creatorTxHash` linking back to it. Works on any EVM-compatible chain.
   */
  private async resolveChildContractsPartA(): Promise<void> {
    // Read the high-water mark
    const cursorResult = await this.dataSource.query(
      `SELECT last_processed_block FROM battlechainindexer_agreement.child_scope_cursor WHERE id = 1`
    );
    const lastProcessedBlock: number = cursorResult?.[0]?.last_processed_block ?? 0;

    // Get all in-scope addresses with child contract scope != None
    const scopedAccounts = await this.agreementAccountRepository
      .createQueryBuilder("acc")
      .where("acc.child_contract_scope != :none", { none: BattlechainService.CHILD_SCOPE_NONE })
      .getMany();

    if (scopedAccounts.length === 0) {
      // No accounts with child scope — just advance the cursor to avoid unbounded growth
      await this.advanceChildScopeCursor(lastProcessedBlock);
      return;
    }

    // Collect unique in-scope addresses as hex bytea buffers for matching transactions.to
    const inScopeAddresses = [...new Set(scopedAccounts.map((a) => a.accountAddress.toLowerCase()))];
    const inScopeBuffers = inScopeAddresses.map((a) => Buffer.from(a.replace("0x", ""), "hex"));

    // Join addresses + transactions to find contracts created by in-scope factories.
    // addresses.creatorTxHash = transactions.hash, and transactions.to = the factory.
    const newDeployments: { deployer_address: string; child_address: string; block_number: number }[] =
      await this.dataSource.query(
        `SELECT
          encode(t."to", 'hex') AS deployer_address,
          encode(a.address, 'hex') AS child_address,
          a."createdInBlockNumber" AS block_number
        FROM addresses a
        JOIN transactions t ON a."creatorTxHash" = t.hash
        WHERE a."createdInBlockNumber" > $1
          AND t."to" = ANY($2)`,
        [lastProcessedBlock, inScopeBuffers]
      );

    if (newDeployments.length > 0) {
      // Group by agreement and apply temporal filtering
      const agreementUpdates = await this.computeChildUpdates(newDeployments, scopedAccounts);

      for (const [agreementAddress, childAddresses] of agreementUpdates) {
        await this.appendChildContracts(agreementAddress, childAddresses);
      }

      this.logger.log(`Part A: resolved ${newDeployments.length} new child contract(s)`);
    }

    // Advance the cursor
    await this.advanceChildScopeCursor(lastProcessedBlock);
  }

  /**
   * Part B: Process the reindex queue — full recomputation for agreements
   * whose scope has changed (account added/removed, chain changes).
   */
  private async resolveChildContractsPartB(): Promise<void> {
    // Atomically dequeue entries: DELETE...RETURNING reads and removes in one step,
    // preventing two polling cycles from processing the same agreement concurrently.
    // Note: dataSource.query() returns [rows[], rowCount] for DELETE...RETURNING.
    const rawResult = await this.dataSource.query(
      `DELETE FROM battlechainindexer_agreement.child_scope_reindex_queue RETURNING agreement_address`
    );
    const queueEntries: { agreement_address: string }[] = Array.isArray(rawResult?.[0]) ? rawResult[0] : rawResult;

    if (!queueEntries || queueEntries.length === 0) {
      return;
    }

    const agreementAddresses = queueEntries.map((e) => e.agreement_address.trim());
    this.logger.log(`Part B: reindexing child contracts for ${agreementAddresses.length} agreement(s)`);

    for (const agreementAddress of agreementAddresses) {
      await this.reindexChildContractsForAgreement(agreementAddress);
    }
  }

  /**
   * Full recomputation of child contracts for a single agreement.
   * Joins addresses + transactions to find all contracts deployed by in-scope factories.
   */
  private async reindexChildContractsForAgreement(agreementAddress: string): Promise<void> {
    const normalizedAddress = agreementAddress.toLowerCase().trim();

    // Get the agreement's creation block for temporal filtering
    const state = await this.agreementStateRepository.findOne({
      where: { agreementAddress: normalizedAddress },
    });
    if (!state || state.createdAtBlock == null) {
      this.logger.warn(`Part B: skipping ${normalizedAddress} — createdAtBlock is null`);
      return;
    }

    // Get all accounts with child scope for this agreement
    const accounts = await this.agreementAccountRepository.find({
      where: { agreementAddress: normalizedAddress },
    });
    const scopedAccounts = accounts.filter((a) => a.childContractScope !== BattlechainService.CHILD_SCOPE_NONE);

    if (scopedAccounts.length === 0) {
      // No child scope — clear child contracts
      await this.replaceChildContracts(normalizedAddress, []);
      return;
    }

    // For each scoped account, find all child contracts via addresses + transactions join
    const allChildAddresses: string[] = [];

    for (const account of scopedAccounts) {
      const deployerBuffer = Buffer.from(account.accountAddress.toLowerCase().replace("0x", ""), "hex");

      const deployments: { child_address: string; block_number: number }[] = await this.dataSource.query(
        `SELECT
          encode(a.address, 'hex') AS child_address,
          a."createdInBlockNumber" AS block_number
        FROM addresses a
        JOIN transactions t ON a."creatorTxHash" = t.hash
        WHERE t."to" = $1`,
        [deployerBuffer]
      );

      for (const dep of deployments) {
        if (this.isChildInScope(dep.block_number, state.createdAtBlock, account.childContractScope)) {
          allChildAddresses.push("0x" + dep.child_address.slice(-40));
        }
      }
    }

    const uniqueChildren = [...new Set(allChildAddresses)];
    if (uniqueChildren.length > 0) {
      this.logger.log(`Part B: agreement ${normalizedAddress} — ${uniqueChildren.length} child contract(s)`);
    }
    await this.replaceChildContracts(normalizedAddress, uniqueChildren);
  }

  /**
   * Given a list of newly discovered child deployments and the scoped accounts,
   * compute which agreements need updating and which child addresses to add.
   */
  private async computeChildUpdates(
    newDeployments: { deployer_address: string; child_address: string; block_number: number }[],
    scopedAccounts: AgreementAccount[]
  ): Promise<Map<string, string[]>> {
    // Build a map: deployerAddress (lowercase, no 0x) → agreements
    const deployerToAgreements = new Map<string, AgreementAccount[]>();
    for (const account of scopedAccounts) {
      const key = account.accountAddress.toLowerCase().replace("0x", "");
      if (!deployerToAgreements.has(key)) {
        deployerToAgreements.set(key, []);
      }
      deployerToAgreements.get(key).push(account);
    }

    // Cache agreement creation blocks
    const agreementBlockCache = new Map<string, number>();

    const result = new Map<string, string[]>();

    for (const dep of newDeployments) {
      // deployer_address is a 40-char hex string (20 bytes) from encode(t."to", 'hex')
      const deployerAddr = dep.deployer_address.slice(-40);
      const childAddr = "0x" + dep.child_address.slice(-40);

      const accounts = deployerToAgreements.get(deployerAddr);
      if (!accounts) continue;

      for (const account of accounts) {
        const agreementAddr = account.agreementAddress.trim().toLowerCase();

        // Look up agreement creation block (cached)
        if (!agreementBlockCache.has(agreementAddr)) {
          const state = await this.agreementStateRepository.findOne({
            where: { agreementAddress: agreementAddr },
          });
          agreementBlockCache.set(agreementAddr, state?.createdAtBlock ?? 0);
        }

        const createdAtBlock = agreementBlockCache.get(agreementAddr);
        if (this.isChildInScope(dep.block_number, createdAtBlock, account.childContractScope)) {
          if (!result.has(agreementAddr)) {
            result.set(agreementAddr, []);
          }
          result.get(agreementAddr).push(childAddr);
        }
      }
    }

    return result;
  }

  /**
   * Check if a child contract's deployment block qualifies for the given scope.
   */
  private isChildInScope(
    childBlockNumber: number,
    agreementCreatedAtBlock: number,
    childContractScope: number
  ): boolean {
    switch (childContractScope) {
      case BattlechainService.CHILD_SCOPE_EXISTING_ONLY:
        return childBlockNumber < agreementCreatedAtBlock;
      case BattlechainService.CHILD_SCOPE_ALL:
        return true;
      case BattlechainService.CHILD_SCOPE_FUTURE_ONLY:
        return childBlockNumber > agreementCreatedAtBlock;
      default:
        return false;
    }
  }

  /**
   * Append child contract addresses to an agreement's covered_child_contracts
   * and recompute covered_contracts as the union.
   */
  private async appendChildContracts(agreementAddress: string, childAddresses: string[]): Promise<void> {
    if (childAddresses.length === 0) return;

    // Use a single query to append new addresses (avoiding duplicates) and recompute the union
    await this.dataSource.query(
      `UPDATE battlechainindexer_agreement.agreement_current_state SET
        covered_child_contracts = (
          SELECT ARRAY(SELECT DISTINCT unnest(
            COALESCE(covered_child_contracts, ARRAY[]::TEXT[]) || $2::TEXT[]
          ))
        ),
        covered_contracts = (
          SELECT ARRAY(SELECT DISTINCT unnest(
            COALESCE(covered_scope_contracts, ARRAY[]::TEXT[])
            || COALESCE(covered_child_contracts, ARRAY[]::TEXT[])
            || $2::TEXT[]
          ))
        ),
        scope_updated_at = NOW(),
        last_updated_at = NOW()
      WHERE agreement_address = $1`,
      [agreementAddress, childAddresses]
    );
  }

  /**
   * Replace an agreement's covered_child_contracts entirely and recompute covered_contracts.
   * Used by Part B (full reindex).
   */
  private async replaceChildContracts(agreementAddress: string, childAddresses: string[]): Promise<void> {
    await this.dataSource.query(
      `UPDATE battlechainindexer_agreement.agreement_current_state SET
        covered_child_contracts = $2::TEXT[],
        covered_contracts = (
          SELECT ARRAY(SELECT DISTINCT unnest(
            COALESCE(covered_scope_contracts, ARRAY[]::TEXT[]) || $2::TEXT[]
          ))
        ),
        scope_updated_at = NOW(),
        last_updated_at = NOW()
      WHERE agreement_address = $1`,
      [agreementAddress, childAddresses]
    );
  }

  /**
   * Advance the child scope cursor to the current max createdInBlockNumber in the
   * addresses table. Only advances forward to handle reorgs gracefully.
   */
  private async advanceChildScopeCursor(currentCursor: number): Promise<void> {
    const result = await this.dataSource.query(`SELECT MAX("createdInBlockNumber") AS "maxBlock" FROM addresses`);

    const maxBlock = result?.[0]?.maxBlock ?? currentCursor;
    if (maxBlock > currentCursor) {
      await this.dataSource.query(
        `UPDATE battlechainindexer_agreement.child_scope_cursor
         SET last_processed_block = $1
         WHERE id = 1 AND last_processed_block < $1`,
        [maxBlock]
      );
    }
  }

  /**
   * Get the current state info for a contract by first finding its agreement,
   * then analyzing the agreement's state change history.
   * Returns NOT_REGISTERED state if contract is not covered by any agreement.
   */
  async getContractStateInfo(contractAddress: string): Promise<ContractStateInfoDto> {
    const normalizedContractAddress = contractAddress.toLowerCase();

    // Find all agreements that cover this contract
    const agreements = await this.agreementStateRepository
      .createQueryBuilder("state")
      .where(":address = ANY(state.covered_contracts)", { address: normalizedContractAddress })
      .getMany();

    if (agreements.length === 0) {
      // No agreement covers this contract yet, but it may still be registered
      // in the AttackRegistry (deployed via BattleChainDeployer without entering attack mode).
      // Check the AgreementOwnerAuthorized event as proof of registration.
      const authorization = await this.agreementOwnerAuthorizedRepository.findOne({
        where: { contractAddress: normalizedContractAddress },
        order: { blockNumber: "DESC", rindexerId: "DESC" },
      });

      if (authorization) {
        return {
          state: "NEW_DEPLOYMENT",
          wasUnderAttack: false,
          registeredAt: authorization.blockTimestamp ? authorization.blockTimestamp.getTime() : null,
          registeredTxHash: authorization.txHash,
          underAttackAt: null,
          productionAt: null,
          commitmentLockedUntil: null,
        };
      }

      return {
        state: "NOT_REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      };
    }

    // Get state info for each covering agreement and return the most progressed one.
    // State progression order (higher = more progressed toward production):
    const stateRank: Record<string, number> = {
      NOT_REGISTERED: 0,
      NOT_DEPLOYED: 1,
      NEW_DEPLOYMENT: 2,
      ATTACK_REQUESTED: 3,
      UNDER_ATTACK: 4,
      PROMOTION_REQUESTED: 5,
      PRODUCTION: 6,
      CORRUPTED: 7,
    };

    const results = await Promise.all(agreements.map((a) => this.getAgreementStateInfoInternal(a.agreementAddress, a)));

    return results.reduce((best, current) => {
      const bestRank = stateRank[best.state] ?? 0;
      const currentRank = stateRank[current.state] ?? 0;
      return currentRank > bestRank ? current : best;
    });
  }

  /**
   * Get the current state info for an agreement by analyzing its state change history.
   * Returns NOT_REGISTERED state if agreement is not found in the AttackRegistry.
   */
  async getAgreementStateInfo(agreementAddress: string): Promise<ContractStateInfoDto> {
    const normalizedAddress = agreementAddress.toLowerCase();
    const agreement = await this.agreementStateRepository.findOne({
      where: { agreementAddress: normalizedAddress },
    });
    return this.getAgreementStateInfoInternal(agreementAddress, agreement ?? undefined);
  }

  /**
   * Internal method to get agreement state info by agreement address.
   */
  private async getAgreementStateInfoInternal(
    agreementAddress: string,
    agreement?: AgreementCurrentState
  ): Promise<ContractStateInfoDto> {
    const normalizedAddress = agreementAddress.toLowerCase();

    // Get all state changes for this agreement, ordered by block number
    const stateChanges = await this.agreementStateChangeRepository.find({
      where: { agreementAddress: normalizedAddress },
      order: { blockNumber: "ASC", logIndex: "ASC" },
    });

    // If no state changes found, agreement is not registered in the AttackRegistry
    if (stateChanges.length === 0) {
      return {
        state: "NOT_REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      };
    }

    // Process state changes to build the state info
    let currentState = ContractState.NEW_DEPLOYMENT;
    let wasUnderAttack = false;
    let registeredAt: number | null = null;
    let registeredTxHash: string | null = null;
    let underAttackAt: number | null = null;
    let underAttackTxHash: string | null = null;
    let productionAt: number | null = null;
    let productionTxHash: string | null = null;
    let attackRequestedAt: number | null = null;
    let attackRequestedTxHash: string | null = null;
    let promotionRequestedAt: number | null = null;
    let promotionRequestedTxHash: string | null = null;
    let corruptedAt: number | null = null;
    let corruptedTxHash: string | null = null;

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
            registeredTxHash = change.txHash ?? null;
          }
          break;
        case ContractState.ATTACK_REQUESTED:
          currentState = ContractState.ATTACK_REQUESTED;
          attackRequestedAt = timestamp;
          attackRequestedTxHash = change.txHash ?? null;
          break;
        case ContractState.UNDER_ATTACK:
          currentState = ContractState.UNDER_ATTACK;
          wasUnderAttack = true;
          underAttackAt = timestamp;
          underAttackTxHash = change.txHash ?? null;
          break;
        case ContractState.PROMOTION_REQUESTED:
          currentState = ContractState.PROMOTION_REQUESTED;
          promotionRequestedAt = timestamp;
          promotionRequestedTxHash = change.txHash ?? null;
          break;
        case ContractState.PRODUCTION:
          currentState = ContractState.PRODUCTION;
          productionAt = timestamp;
          productionTxHash = change.txHash ?? null;
          break;
        case ContractState.CORRUPTED:
          currentState = ContractState.CORRUPTED;
          corruptedAt = timestamp;
          corruptedTxHash = change.txHash ?? null;
          break;
      }
    }

    // Apply time-based state transitions that occur without emitting events,
    // mirroring the smart contract's _getAgreementState() logic.
    // The contract computes state dynamically from timestamps — these transitions
    // happen silently without AgreementStateChanged events.
    const now = Date.now();

    if (currentState !== ContractState.PRODUCTION && currentState !== ContractState.CORRUPTED) {
      // 1. Promotion delay elapsed: promotionRequestedTimestamp + PROMOTION_DELAY has passed
      if (currentState === ContractState.PROMOTION_REQUESTED && promotionRequestedAt) {
        const promotionCompletesAt = promotionRequestedAt + PROMOTION_DELAY_MS;
        if (now >= promotionCompletesAt) {
          currentState = ContractState.PRODUCTION;
          productionAt = promotionCompletesAt;
          productionTxHash = null; // No tx — time-based transition
        }
      }

      // 2. Auto-promotion: deadline (registeredAt + PROMOTION_WINDOW) has passed
      // This applies to NEW_DEPLOYMENT and ATTACK_REQUESTED states
      if (currentState !== ContractState.PRODUCTION && currentState !== ContractState.UNDER_ATTACK && registeredAt) {
        const deadlineTimestamp = registeredAt + PROMOTION_WINDOW_MS;
        if (now >= deadlineTimestamp) {
          currentState = ContractState.PRODUCTION;
          productionAt = deadlineTimestamp;
          productionTxHash = null; // No tx — time-based transition
        }
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

    // Use the materialized computed_state if available, as it accounts for
    // time-based transitions (auto-promotion) applied by the periodic timer.
    // The event-based computation above may miss these since they happen without events.
    const resolvedState = agreement?.computedState || stateNames[currentState] || "NOT_REGISTERED";

    // If auto-promoted to PRODUCTION but no event recorded the timestamp,
    // derive it from the materialized registered_at + promotion window.
    if (resolvedState === "PRODUCTION" && !productionAt) {
      const materializedRegisteredAt = agreement?.registeredAt?.getTime() ?? registeredAt;
      if (materializedRegisteredAt) {
        if (agreement?.promotionRequestedAt) {
          productionAt = agreement.promotionRequestedAt.getTime() + PROMOTION_DELAY_MS;
        } else {
          productionAt = materializedRegisteredAt + PROMOTION_WINDOW_MS;
        }
        productionTxHash = null;
      }
    }

    // Backfill registeredAt from materialized table if missing from events
    if (!registeredAt && agreement?.registeredAt) {
      registeredAt = agreement.registeredAt.getTime();
    }

    // Get commitmentLockedUntil from the agreement if available
    const commitmentLockedUntil = agreement?.commitmentDeadline ? Number(agreement.commitmentDeadline) * 1000 : null;

    return {
      state: resolvedState,
      wasUnderAttack,
      registeredAt,
      registeredTxHash,
      underAttackAt,
      underAttackTxHash,
      productionAt,
      productionTxHash,
      attackRequestedAt,
      attackRequestedTxHash,
      promotionRequestedAt,
      promotionRequestedTxHash,
      corruptedAt,
      corruptedTxHash,
      promotionWindowEnds,
      commitmentLockedUntil,
    };
  }

  /**
   * Map AgreementCurrentState entity to AgreementDto
   */
  private mapStateToDto(
    state: AgreementCurrentState,
    coveredAccounts?: CoveredAccountDto[],
    agreementState?: string
  ): AgreementDto {
    return {
      agreementAddress: state.agreementAddress,
      owner: state.owner,
      state: agreementState,
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
      coveredAccounts,
      createdAtBlock: state.createdAtBlock,
      createdAt: state.createdAt ? state.createdAt.getTime() : null,
      valueBand: state.valueBand ?? undefined,
      valuePricedUsd: state.valuePricedUsd ?? undefined,
      valueNativeUsd: state.valueNativeUsd ?? undefined,
      valuePricedTokens: state.valuePricedTokens ?? undefined,
      valueUnpricedTokens: state.valueUnpricedTokens ?? undefined,
      valueConfidence: state.valueConfidence ?? undefined,
      valueEstimatedAt: state.valueEstimatedAt ? state.valueEstimatedAt.getTime() : undefined,
    };
  }

  /**
   * Get covered accounts with their child contract scopes for an agreement
   */
  private async getCoveredAccounts(agreementAddress: string): Promise<CoveredAccountDto[]> {
    const accounts = await this.agreementAccountRepository.find({
      where: { agreementAddress: agreementAddress.toLowerCase() },
    });

    return accounts.map((acc) => ({
      accountAddress: acc.accountAddress,
      childContractScope: acc.childContractScope,
    }));
  }

  /**
   * If the agreement has not been RPC-fetched yet, fetch details from the
   * on-chain contract and update the database. Returns the (possibly updated) entity.
   */
  private async ensureAgreementDetails(state: AgreementCurrentState): Promise<AgreementCurrentState> {
    if (state.rpcFetchedAt || !this.rpcProvider) {
      return state;
    }

    const address = state.agreementAddress.trim();

    // Deduplicate concurrent fetches for the same agreement
    const existing = this.inFlightFetches.get(address);
    if (existing) {
      await existing;
      return (await this.agreementStateRepository.findOne({ where: { agreementAddress: address } })) ?? state;
    }

    const fetchPromise = this.fetchAndStoreDetails(address);
    this.inFlightFetches.set(address, fetchPromise);

    try {
      await fetchPromise;
      return (await this.agreementStateRepository.findOne({ where: { agreementAddress: address } })) ?? state;
    } catch (error) {
      this.logger.error({
        message: "Failed to fetch agreement details via RPC",
        stack: (error as Error)?.stack,
        data: { agreementAddress: address },
      });
      return state;
    } finally {
      this.inFlightFetches.delete(address);
    }
  }

  private async fetchAndStoreDetails(agreementAddress: string): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("RPC fetch timeout")), RPC_FETCH_TIMEOUT_MS)
    );

    await Promise.race([this.fetchAndStoreDetailsInternal(agreementAddress), timeoutPromise]);
  }

  private async fetchAndStoreDetailsInternal(agreementAddress: string): Promise<void> {
    const contract = new Contract(agreementAddress, AGREEMENT_ABI, this.rpcProvider);

    const [detailsResult, deadlineResult] = await Promise.allSettled([
      contract.getDetails(),
      contract.getCantChangeUntil(),
    ]);

    const now = new Date();
    const updateData: Partial<AgreementCurrentState> = {
      rpcFetchedAt: now,
      lastUpdatedAt: now,
    };

    if (detailsResult.status === "fulfilled") {
      const details = detailsResult.value;

      updateData.protocolName = details.protocolName || null;
      updateData.protocolNameUpdatedAt = now;

      updateData.agreementUri = details.agreementURI || null;
      updateData.agreementUriUpdatedAt = now;

      updateData.bountyPercentage = details.bountyTerms.bountyPercentage.toString();
      updateData.bountyCapUsd = details.bountyTerms.bountyCapUsd.toString();
      updateData.retainable = details.bountyTerms.retainable;
      updateData.identityRequirement = Number(details.bountyTerms.identity);
      updateData.diligenceRequirements = details.bountyTerms.diligenceRequirements || null;
      updateData.aggregateBountyCapUsd = details.bountyTerms.aggregateBountyCapUsd.toString();
      updateData.bountyTermsUpdatedAt = now;

      updateData.contactDetails = details.contactDetails.map((c: { name: string; contact: string }) => ({
        name: c.name,
        contact: c.contact,
      }));
      updateData.contactDetailsUpdatedAt = now;

      // Upsert chain accounts
      if (details.chains && details.chains.length > 0) {
        await this.upsertAccountsFromChains(agreementAddress, details.chains);
      }
    }

    if (deadlineResult.status === "fulfilled") {
      updateData.commitmentDeadline = deadlineResult.value.toString();
      updateData.commitmentDeadlineUpdatedAt = now;
    }

    await this.agreementStateRepository.update({ agreementAddress }, updateData);
  }

  private async upsertAccountsFromChains(
    agreementAddress: string,
    chains: {
      assetRecoveryAddress: string;
      accounts: { accountAddress: string; childContractScope: number }[];
      caip2ChainId: string;
    }[]
  ): Promise<void> {
    for (const chain of chains) {
      for (const account of chain.accounts) {
        await this.agreementAccountRepository
          .createQueryBuilder()
          .insert()
          .into(AgreementAccount)
          .values({
            agreementAddress,
            caip2ChainId: chain.caip2ChainId,
            accountAddress: account.accountAddress,
            childContractScope: Number(account.childContractScope),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .orUpdate(["child_contract_scope", "updated_at"], ["agreement_address", "caip2_chain_id", "account_address"])
          .execute();
      }
    }
  }

  /**
   * Get agreement by its address.
   * Uses the materialized agreement_current_state table for single-query lookup.
   */
  async getAgreement(agreementAddress: string): Promise<AgreementDto | null> {
    const normalizedAddress = agreementAddress.toLowerCase();

    let state = await this.agreementStateRepository.findOne({
      where: { agreementAddress: normalizedAddress },
    });

    if (!state) {
      return null;
    }

    state = await this.ensureAgreementDetails(state);
    const coveredAccounts = await this.getCoveredAccounts(normalizedAddress);
    return this.mapStateToDto(state, coveredAccounts, state.computedState || "NOT_REGISTERED");
  }

  /**
   * Get all agreements covering a specific contract address.
   * Uses the GIN index on covered_contracts for efficient array contains query.
   */
  async getAgreementsByContract(contractAddress: string): Promise<AgreementDto[]> {
    const normalizedAddress = contractAddress.toLowerCase();

    // Use GIN index for array contains query
    const states = await this.agreementStateRepository
      .createQueryBuilder("state")
      .where(":address = ANY(state.covered_contracts)", { address: normalizedAddress })
      .getMany();

    if (states.length === 0) {
      return [];
    }

    // Batch fetch accounts for all matching agreements
    const addresses = states.map((s) => s.agreementAddress.toLowerCase());
    const accountsByAgreement = await this.getAccountsForAgreements(addresses);

    const results: AgreementDto[] = [];
    for (const state of states) {
      const enriched = await this.ensureAgreementDetails(state);
      results.push(
        this.mapStateToDto(
          enriched,
          accountsByAgreement.get(state.agreementAddress.toLowerCase()),
          enriched.computedState || "NOT_REGISTERED"
        )
      );
    }
    return results;
  }

  /**
   * Get agreement info for a contract address, checking both:
   * 1. If the address IS an agreement contract itself
   * 2. If the address is covered BY an agreement (possibly multiple)
   */
  async getAgreementInfoForContract(
    contractAddress: string
  ): Promise<{ agreements: AgreementDto[]; isAgreementContract: boolean }> {
    const normalizedAddress = contractAddress.toLowerCase();

    // First check if this address IS an agreement contract
    const agreementState = await this.agreementStateRepository.findOne({
      where: { agreementAddress: normalizedAddress },
    });

    // Get all agreements that cover this address
    const coveredBy = await this.getAgreementsByContract(contractAddress);

    if (agreementState) {
      // It's an agreement contract - include it first, then any others that cover it
      const enrichedState = await this.ensureAgreementDetails(agreementState);
      const coveredAccounts = await this.getCoveredAccounts(normalizedAddress);
      const selfDto = this.mapStateToDto(
        enrichedState,
        coveredAccounts,
        enrichedState.computedState || "NOT_REGISTERED"
      );

      // Deduplicate: coveredBy may include the agreement itself
      const others = coveredBy.filter((a) => a.agreementAddress !== normalizedAddress);

      return {
        agreements: [selfDto, ...others],
        isAgreementContract: true,
      };
    }

    return {
      agreements: coveredBy,
      isAgreementContract: false,
    };
  }

  /**
   * Map frontend sort keys to database column names
   */
  private mapSortColumn(sortBy: string): string {
    const sortColumnMap: Record<string, string> = {
      protocolName: "agreement.protocolName",
      bountyPercentage: "agreement.bountyPercentage",
      bountyCapUsd: "agreement.bountyCapUsd",
      createdAt: "agreement.createdAt",
      valuePricedUsd: "agreement.valuePricedUsd",
    };
    return sortColumnMap[sortBy] || "agreement.createdAt";
  }

  /**
   * Get all agreements with optional state filtering, pagination, and sorting.
   * Uses the materialized agreement_current_state table for efficient retrieval.
   */
  async getAllAgreements(
    stateFilter?: string,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder: "ASC" | "DESC" = "DESC"
  ): Promise<PaginatedAgreementsDto> {
    // Clamp limit to max 100
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    // Build query with SQL-level filtering, sorting, and pagination
    // using the materialized computed_state column
    let query = this.agreementStateRepository.createQueryBuilder("agreement");

    // Filter by materialized state in SQL
    if (stateFilter) {
      query = query.where("agreement.computed_state = :state", { state: stateFilter });
    }

    // Sort — state sorting uses a CASE expression for custom ordering
    if (sortBy === "state") {
      query = query.orderBy(
        `CASE agreement.computed_state
          WHEN 'NEW_DEPLOYMENT' THEN 0
          WHEN 'ATTACK_REQUESTED' THEN 1
          WHEN 'UNDER_ATTACK' THEN 2
          WHEN 'CORRUPTED' THEN 3
          WHEN 'PROMOTION_REQUESTED' THEN 4
          WHEN 'PRODUCTION' THEN 5
          ELSE 99 END`,
        sortOrder
      );
    } else {
      const sortColumn = this.mapSortColumn(sortBy);
      query = query.orderBy(sortColumn, sortOrder, "NULLS LAST");
    }
    // Stable tiebreaker so equal primary-sort values (e.g. valuePricedUsd=0) don't appear randomly ordered.
    if (sortBy !== "createdAt") {
      query = query.addOrderBy("agreement.createdAt", "DESC", "NULLS LAST");
    }

    // Get total count + paginated results in a single SQL query
    const [paginatedStates, total] = await query.skip(offset).take(safeLimit).getManyAndCount();

    // Get accounts only for paginated results
    const paginatedAddresses = paginatedStates.map((s) => s.agreementAddress.toLowerCase());
    const accountsByAgreement = await this.getAccountsForAgreements(paginatedAddresses);

    // Map to DTOs using the materialized state
    const items = paginatedStates.map((state) =>
      this.mapStateToDto(
        state,
        accountsByAgreement.get(state.agreementAddress.toLowerCase()),
        state.computedState || "NOT_REGISTERED"
      )
    );

    return {
      items,
      meta: {
        currentPage: safePage,
        itemCount: items.length,
        itemsPerPage: safeLimit,
        totalItems: total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Get covered accounts for a set of agreements efficiently
   */
  private async getAccountsForAgreements(agreementAddresses: string[]): Promise<Map<string, CoveredAccountDto[]>> {
    const accountsByAgreement = new Map<string, CoveredAccountDto[]>();

    if (agreementAddresses.length === 0) {
      return accountsByAgreement;
    }

    const accounts = await this.agreementAccountRepository
      .createQueryBuilder("account")
      .where("LOWER(account.agreementAddress) IN (:...addresses)", { addresses: agreementAddresses })
      .getMany();

    for (const account of accounts) {
      const key = account.agreementAddress.toLowerCase();
      if (!accountsByAgreement.has(key)) {
        accountsByAgreement.set(key, []);
      }
      const list = accountsByAgreement.get(key);
      if (list) {
        list.push({
          accountAddress: account.accountAddress,
          childContractScope: account.childContractScope,
        });
      }
    }

    return accountsByAgreement;
  }

  /**
   * Get the authorized owner for a contract address.
   * Returns null if the contract was not deployed via BattleChainDeployer.
   * Returns the most recent authorized owner if ownership was transferred.
   */
  async getAuthorizedOwner(contractAddress: string): Promise<string | null> {
    const normalizedAddress = contractAddress.toLowerCase();

    // Get the most recent AgreementOwnerAuthorized event for this contract
    const authorization = await this.agreementOwnerAuthorizedRepository.findOne({
      where: { contractAddress: normalizedAddress },
      order: { blockNumber: "DESC", rindexerId: "DESC" },
    });

    return authorization?.authorizedOwner ?? null;
  }

  /**
   * Get authorized owners for multiple contract addresses in batch.
   * Used for checking authorization across all contracts in an agreement scope.
   */
  async getAuthorizedOwners(contractAddresses: string[]): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};

    // Initialize all addresses with null
    for (const address of contractAddresses) {
      results[address.toLowerCase()] = null;
    }

    if (contractAddresses.length === 0) {
      return results;
    }

    // Fetch all authorization records for the given addresses
    const normalizedAddresses = contractAddresses.map((a) => a.toLowerCase());
    const authorizations = await this.agreementOwnerAuthorizedRepository
      .createQueryBuilder("auth")
      .where("LOWER(auth.contractAddress) IN (:...addresses)", { addresses: normalizedAddresses })
      .orderBy("auth.blockNumber", "DESC")
      .addOrderBy("auth.rindexerId", "DESC")
      .getMany();

    // Group by contract address and take the most recent (first in the sorted list)
    const seenAddresses = new Set<string>();
    for (const auth of authorizations) {
      const normalizedContract = auth.contractAddress.toLowerCase();
      if (!seenAddresses.has(normalizedContract)) {
        results[normalizedContract] = auth.authorizedOwner;
        seenAddresses.add(normalizedContract);
      }
    }

    return results;
  }

  /**
   * Get the current attack moderator for an agreement.
   *
   * The attack moderator is initially set to the Agreement owner when the agreement
   * is registered in the AttackRegistry. It can be transferred via transferAttackModerator().
   *
   * Logic:
   * 1. Check for any AttackModeratorTransferred events (most recent wins)
   * 2. If no transfers, fall back to the Agreement owner (initial moderator)
   *
   * @returns AttackModeratorDto with the current moderator address and transfer status
   */
  async getAttackModerator(agreementAddress: string): Promise<AttackModeratorDto | null> {
    const normalizedAddress = agreementAddress.toLowerCase();

    // First, check if there have been any moderator transfers
    const latestTransfer = await this.attackModeratorTransferredRepository.findOne({
      where: { agreementAddress: normalizedAddress },
      order: { blockNumber: "DESC", rindexerId: "DESC" },
    });

    if (latestTransfer) {
      // Moderator was transferred, use the new moderator
      return {
        attackModerator: latestTransfer.newModerator,
        wasTransferred: true,
      };
    }

    // No transfers - initial moderator equals the Agreement owner at registration time
    // Get the agreement to find its owner
    const agreement = await this.agreementStateRepository.findOne({
      where: { agreementAddress: normalizedAddress },
    });

    if (!agreement) {
      return null;
    }

    return {
      attackModerator: agreement.owner,
      wasTransferred: false,
    };
  }
}
