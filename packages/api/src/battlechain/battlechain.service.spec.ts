import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { mock } from "jest-mock-extended";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder, DataSource } from "typeorm";
import { BattlechainService } from "./battlechain.service";
import { AgreementStateChange } from "./agreementState.entity";
import { AgreementCurrentState } from "./agreementCurrentState.entity";
import { AgreementAccount } from "./agreementAccount.entity";
import { AgreementOwnerAuthorized } from "./agreementOwnerAuthorized.entity";
import { AttackModeratorTransferred } from "./attackModeratorTransferred.entity";
import { ContractState } from "./battlechain.dto";
import { PROMOTION_WINDOW_MS, PROMOTION_DELAY_MS } from "./battlechain.constants";

// Helper to build a minimal AgreementCurrentState mock
const makeAgreementState = (
  overrides: Partial<AgreementCurrentState> = {}
): AgreementCurrentState =>
  ({
    agreementAddress: "0xagreement1234567890123456789012345678901",
    owner: "0xowner",
    coveredScopeContracts: [],
    coveredChildContracts: [],
    coveredContracts: [],
    createdAtBlock: 100,
    createdAt: new Date(),
    protocolName: null,
    protocolNameUpdatedAt: null,
    agreementUri: null,
    agreementUriUpdatedAt: null,
    bountyPercentage: null,
    bountyCapUsd: null,
    retainable: null,
    identityRequirement: null,
    diligenceRequirements: null,
    aggregateBountyCapUsd: null,
    bountyTermsUpdatedAt: null,
    contactDetails: null,
    contactDetailsUpdatedAt: null,
    commitmentDeadline: null,
    commitmentDeadlineUpdatedAt: null,
    scopeUpdatedAt: null,
    lastUpdatedAt: null,
    rpcFetchedAt: null,
    ...overrides,
  }) as AgreementCurrentState;

describe("BattlechainService", () => {
  let service: BattlechainService;
  let agreementStateChangeRepository: Repository<AgreementStateChange>;
  let agreementStateRepository: Repository<AgreementCurrentState>;
  let agreementAccountRepository: Repository<AgreementAccount>;
  let agreementOwnerAuthorizedRepository: Repository<AgreementOwnerAuthorized>;
  let attackModeratorTransferredRepository: Repository<AttackModeratorTransferred>;
  let dataSource: DataSource;
  let configService: ConfigService;

  beforeEach(async () => {
    agreementStateChangeRepository = mock<Repository<AgreementStateChange>>();
    agreementStateRepository = mock<Repository<AgreementCurrentState>>();
    agreementAccountRepository = mock<Repository<AgreementAccount>>();
    agreementOwnerAuthorizedRepository = mock<Repository<AgreementOwnerAuthorized>>();
    attackModeratorTransferredRepository = mock<Repository<AttackModeratorTransferred>>();
    dataSource = mock<DataSource>();
    configService = mock<ConfigService>();

    // Default: no RPC URL configured (preserves existing test behavior)
    (configService.get as jest.Mock).mockReturnValue(null);

    // Mock createQueryBuilder for agreementStateRepository
    const mockQueryBuilder = mock<SelectQueryBuilder<AgreementCurrentState>>();
    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.getOne.mockResolvedValue(null);
    (agreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    // Mock find for agreementAccountRepository (returns empty by default)
    (agreementAccountRepository.find as jest.Mock).mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattlechainService,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: getRepositoryToken(AgreementStateChange),
          useValue: agreementStateChangeRepository,
        },
        {
          provide: getRepositoryToken(AgreementCurrentState),
          useValue: agreementStateRepository,
        },
        {
          provide: getRepositoryToken(AgreementAccount),
          useValue: agreementAccountRepository,
        },
        {
          provide: getRepositoryToken(AgreementOwnerAuthorized),
          useValue: agreementOwnerAuthorizedRepository,
        },
        {
          provide: getRepositoryToken(AttackModeratorTransferred),
          useValue: attackModeratorTransferredRepository,
        },
      ],
    }).compile();

    service = module.get<BattlechainService>(BattlechainService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("getContractStateInfo", () => {
    const contractAddress = "0x1234567890123456789012345678901234567890";
    const agreementAddress = "0xagreement1234567890123456789012345678901";

    it("returns NOT_REGISTERED when no agreement covers the contract", async () => {
      const mockQueryBuilder = mock<SelectQueryBuilder<AgreementCurrentState>>();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      (agreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result).toEqual({
        state: "NOT_REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      });
    });

    it("returns correct state from agreement state changes", async () => {
      // Use fake timers so registration is recent (within 14-day window)
      const now = new Date("2024-01-05T00:00:00Z");
      jest.useFakeTimers({ now });
      const timestamp = new Date("2024-01-01T00:00:00Z");

      // Mock finding the agreement that covers this contract
      const mockQueryBuilder = mock<SelectQueryBuilder<AgreementCurrentState>>();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(
        makeAgreementState({
          agreementAddress: agreementAddress.toLowerCase(),
          coveredScopeContracts: [contractAddress.toLowerCase()],
          coveredContracts: [contractAddress.toLowerCase()],
          createdAt: timestamp,
        })
      );
      (agreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      // Mock the agreement state changes
      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: timestamp,
        },
      ]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result.state).toBe("NEW_DEPLOYMENT");
      expect(result.wasUnderAttack).toBe(false);
      expect(result.registeredAt).toBe(timestamp.getTime());
      expect(result.underAttackAt).toBeNull();
      expect(result.productionAt).toBeNull();
      // Should have promotion window calculated
      expect(result.promotionWindowEnds).toBeDefined();

      jest.useRealTimers();
    });

    it("correctly processes multiple state changes to PRODUCTION", async () => {
      const registeredTime = new Date("2024-01-01T00:00:00Z");
      const productionTime = new Date("2024-01-02T00:00:00Z");

      // Mock finding the agreement
      const mockQueryBuilder = mock<SelectQueryBuilder<AgreementCurrentState>>();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: "0xowner",
        coveredScopeContracts: [contractAddress.toLowerCase()],
        coveredChildContracts: [],
        coveredContracts: [contractAddress.toLowerCase()],
        createdAtBlock: 100,
        createdAt: registeredTime,
        protocolName: null,
        protocolNameUpdatedAt: null,
        agreementUri: null,
        agreementUriUpdatedAt: null,
        bountyPercentage: null,
        bountyCapUsd: null,
        retainable: null,
        identityRequirement: null,
        diligenceRequirements: null,
        aggregateBountyCapUsd: null,
        bountyTermsUpdatedAt: null,
        contactDetails: null,
        contactDetailsUpdatedAt: null,
        commitmentDeadline: null,
        commitmentDeadlineUpdatedAt: null,
        scopeUpdatedAt: null,
        lastUpdatedAt: null,
        rpcFetchedAt: null,
      });
      (agreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredTime,
        },
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.PRODUCTION,
          blockNumber: 200,
          logIndex: "0",
          blockTimestamp: productionTime,
        },
      ]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result.state).toBe("PRODUCTION");
      expect(result.wasUnderAttack).toBe(false);
      expect(result.registeredAt).toBe(registeredTime.getTime());
      expect(result.underAttackAt).toBeNull();
      expect(result.productionAt).toBe(productionTime.getTime());
    });

    it("sets wasUnderAttack true when agreement went through UNDER_ATTACK state", async () => {
      const registeredTime = new Date("2024-01-01T00:00:00Z");
      const attackTime = new Date("2024-01-02T00:00:00Z");
      const productionTime = new Date("2024-01-03T00:00:00Z");

      // Mock finding the agreement
      const mockQueryBuilder = mock<SelectQueryBuilder<AgreementCurrentState>>();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: "0xowner",
        coveredScopeContracts: [contractAddress.toLowerCase()],
        coveredChildContracts: [],
        coveredContracts: [contractAddress.toLowerCase()],
        createdAtBlock: 100,
        createdAt: registeredTime,
        protocolName: null,
        protocolNameUpdatedAt: null,
        agreementUri: null,
        agreementUriUpdatedAt: null,
        bountyPercentage: null,
        bountyCapUsd: null,
        retainable: null,
        identityRequirement: null,
        diligenceRequirements: null,
        aggregateBountyCapUsd: null,
        bountyTermsUpdatedAt: null,
        contactDetails: null,
        contactDetailsUpdatedAt: null,
        commitmentDeadline: null,
        commitmentDeadlineUpdatedAt: null,
        scopeUpdatedAt: null,
        lastUpdatedAt: null,
        rpcFetchedAt: null,
      });
      (agreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredTime,
        },
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.UNDER_ATTACK,
          blockNumber: 200,
          logIndex: "0",
          blockTimestamp: attackTime,
        },
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.PRODUCTION,
          blockNumber: 300,
          logIndex: "0",
          blockTimestamp: productionTime,
        },
      ]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result.state).toBe("PRODUCTION");
      expect(result.wasUnderAttack).toBe(true);
      expect(result.registeredAt).toBe(registeredTime.getTime());
      expect(result.underAttackAt).toBe(attackTime.getTime());
      expect(result.productionAt).toBe(productionTime.getTime());
    });
  });

  describe("getAgreementStateInfo", () => {
    const agreementAddress = "0xagreement1234567890123456789012345678901";

    it("returns NOT_REGISTERED when no state changes exist", async () => {
      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getAgreementStateInfo(agreementAddress);

      expect(result).toEqual({
        state: "NOT_REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      });
      expect(agreementStateChangeRepository.find).toHaveBeenCalledWith({
        where: { agreementAddress: agreementAddress.toLowerCase() },
        order: { blockNumber: "ASC", logIndex: "ASC" },
      });
    });

    it("handles null blockTimestamp", async () => {
      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: null,
        },
      ]);

      const result = await service.getAgreementStateInfo(agreementAddress);

      expect(result).toEqual({
        state: "NEW_DEPLOYMENT",
        wasUnderAttack: false,
        registeredAt: null,
        registeredTxHash: null,
        underAttackAt: null,
        underAttackTxHash: null,
        productionAt: null,
        productionTxHash: null,
        attackRequestedAt: null,
        attackRequestedTxHash: null,
        promotionRequestedAt: null,
        promotionRequestedTxHash: null,
        corruptedAt: null,
        corruptedTxHash: null,
        promotionWindowEnds: null,
        commitmentLockedUntil: null,
      });
    });

    it("normalizes address case", async () => {
      const upperCaseAddress = "0xAGREEMENT123456789012345678901234567890";
      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([]);

      await service.getAgreementStateInfo(upperCaseAddress);

      expect(agreementStateChangeRepository.find).toHaveBeenCalledWith({
        where: { agreementAddress: upperCaseAddress.toLowerCase() },
        order: { blockNumber: "ASC", logIndex: "ASC" },
      });
    });
  });

  describe("time-based state transitions", () => {
    const agreementAddress = "0xagreement1234567890123456789012345678901";

    it("auto-promotes NEW_DEPLOYMENT to PRODUCTION after deadline passes", async () => {
      const registeredAt = new Date("2024-01-01T00:00:00Z");
      // Set "now" to 15 days after registration (past 14-day deadline)
      jest.useFakeTimers({ now: new Date(registeredAt.getTime() + 15 * 24 * 60 * 60 * 1000) });

      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredAt,
          txHash: "0xreg",
        },
      ]);

      const result = await service.getAgreementStateInfo(agreementAddress);

      expect(result.state).toBe("PRODUCTION");
      expect(result.productionAt).toBe(registeredAt.getTime() + PROMOTION_WINDOW_MS);
      expect(result.productionTxHash).toBeNull(); // No tx for time-based transition

      jest.useRealTimers();
    });

    it("auto-promotes ATTACK_REQUESTED to PRODUCTION after deadline passes", async () => {
      const registeredAt = new Date("2024-01-01T00:00:00Z");
      const attackRequestedAt = new Date("2024-01-02T00:00:00Z");
      // Set "now" to 15 days after registration (past 14-day deadline)
      jest.useFakeTimers({ now: new Date(registeredAt.getTime() + 15 * 24 * 60 * 60 * 1000) });

      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredAt,
          txHash: "0xreg",
        },
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.ATTACK_REQUESTED,
          blockNumber: 200,
          logIndex: "0",
          blockTimestamp: attackRequestedAt,
          txHash: "0xattackreq",
        },
      ]);

      const result = await service.getAgreementStateInfo(agreementAddress);

      expect(result.state).toBe("PRODUCTION");
      expect(result.productionAt).toBe(registeredAt.getTime() + PROMOTION_WINDOW_MS);

      jest.useRealTimers();
    });

    it("keeps ATTACK_REQUESTED state when deadline has not passed", async () => {
      const registeredAt = new Date("2024-01-01T00:00:00Z");
      const attackRequestedAt = new Date("2024-01-02T00:00:00Z");
      // Set "now" to 5 days after registration (within 14-day window)
      jest.useFakeTimers({ now: new Date(registeredAt.getTime() + 5 * 24 * 60 * 60 * 1000) });

      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredAt,
          txHash: "0xreg",
        },
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.ATTACK_REQUESTED,
          blockNumber: 200,
          logIndex: "0",
          blockTimestamp: attackRequestedAt,
          txHash: "0xattackreq",
        },
      ]);

      const result = await service.getAgreementStateInfo(agreementAddress);

      expect(result.state).toBe("ATTACK_REQUESTED");

      jest.useRealTimers();
    });

    it("promotes PROMOTION_REQUESTED to PRODUCTION after delay passes", async () => {
      const registeredAt = new Date("2024-01-01T00:00:00Z");
      const promotionRequestedAt = new Date("2024-01-10T00:00:00Z");
      // Set "now" to 4 days after promotion request (past 3-day delay)
      jest.useFakeTimers({ now: new Date(promotionRequestedAt.getTime() + 4 * 24 * 60 * 60 * 1000) });

      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredAt,
          txHash: "0xreg",
        },
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.PROMOTION_REQUESTED,
          blockNumber: 200,
          logIndex: "0",
          blockTimestamp: promotionRequestedAt,
          txHash: "0xpromoreq",
        },
      ]);

      const result = await service.getAgreementStateInfo(agreementAddress);

      expect(result.state).toBe("PRODUCTION");
      expect(result.productionAt).toBe(promotionRequestedAt.getTime() + PROMOTION_DELAY_MS);
      expect(result.productionTxHash).toBeNull();

      jest.useRealTimers();
    });

    it("keeps PROMOTION_REQUESTED state when delay has not passed", async () => {
      const registeredAt = new Date("2024-01-01T00:00:00Z");
      const promotionRequestedAt = new Date("2024-01-10T00:00:00Z");
      // Set "now" to 1 day after promotion request (within 3-day delay)
      jest.useFakeTimers({ now: new Date(promotionRequestedAt.getTime() + 1 * 24 * 60 * 60 * 1000) });

      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredAt,
          txHash: "0xreg",
        },
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.PROMOTION_REQUESTED,
          blockNumber: 200,
          logIndex: "0",
          blockTimestamp: promotionRequestedAt,
          txHash: "0xpromoreq",
        },
      ]);

      const result = await service.getAgreementStateInfo(agreementAddress);

      expect(result.state).toBe("PROMOTION_REQUESTED");

      jest.useRealTimers();
    });

    it("does not auto-promote UNDER_ATTACK even after deadline", async () => {
      const registeredAt = new Date("2024-01-01T00:00:00Z");
      const underAttackAt = new Date("2024-01-05T00:00:00Z");
      // Set "now" well past the 14-day deadline
      jest.useFakeTimers({ now: new Date(registeredAt.getTime() + 30 * 24 * 60 * 60 * 1000) });

      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredAt,
          txHash: "0xreg",
        },
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.UNDER_ATTACK,
          blockNumber: 200,
          logIndex: "0",
          blockTimestamp: underAttackAt,
          txHash: "0xattack",
        },
      ]);

      const result = await service.getAgreementStateInfo(agreementAddress);

      // UNDER_ATTACK is not auto-promoted by deadline — needs explicit transition
      expect(result.state).toBe("UNDER_ATTACK");

      jest.useRealTimers();
    });

    it("does not override CORRUPTED state with time-based promotion", async () => {
      const registeredAt = new Date("2024-01-01T00:00:00Z");
      const corruptedAt = new Date("2024-01-05T00:00:00Z");
      // Set "now" well past the 14-day deadline
      jest.useFakeTimers({ now: new Date(registeredAt.getTime() + 30 * 24 * 60 * 60 * 1000) });

      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredAt,
          txHash: "0xreg",
        },
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.CORRUPTED,
          blockNumber: 200,
          logIndex: "0",
          blockTimestamp: corruptedAt,
          txHash: "0xcorrupt",
        },
      ]);

      const result = await service.getAgreementStateInfo(agreementAddress);

      expect(result.state).toBe("CORRUPTED");

      jest.useRealTimers();
    });

    it("does not override explicit PRODUCTION state", async () => {
      const registeredAt = new Date("2024-01-01T00:00:00Z");
      const productionAt = new Date("2024-01-05T00:00:00Z");
      jest.useFakeTimers({ now: new Date(registeredAt.getTime() + 30 * 24 * 60 * 60 * 1000) });

      (agreementStateChangeRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredAt,
          txHash: "0xreg",
        },
        {
          agreementAddress: agreementAddress.toLowerCase(),
          newState: ContractState.PRODUCTION,
          blockNumber: 200,
          logIndex: "0",
          blockTimestamp: productionAt,
          txHash: "0xprod",
        },
      ]);

      const result = await service.getAgreementStateInfo(agreementAddress);

      expect(result.state).toBe("PRODUCTION");
      // Should use the explicit production timestamp, not the deadline
      expect(result.productionAt).toBe(productionAt.getTime());
      expect(result.productionTxHash).toBe("0xprod");

      jest.useRealTimers();
    });
  });

  describe("getAgreement", () => {
    const agreementAddress = "0xagreement1234567890123456789012345678901";
    const ownerAddress = "0xowner12345678901234567890123456789012345";

    it("returns null when agreement doesn't exist", async () => {
      (agreementStateRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getAgreement(agreementAddress);

      expect(result).toBeNull();
      expect(agreementStateRepository.findOne).toHaveBeenCalledWith({
        where: { agreementAddress: agreementAddress.toLowerCase() },
      });
    });

    it("returns agreement with covered contracts from materialized view", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");

      (agreementStateRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        protocolName: null,
        agreementUri: null,
        bountyPercentage: null,
        bountyCapUsd: null,
        retainable: null,
        identityRequirement: null,
        diligenceRequirements: null,
        aggregateBountyCapUsd: null,
        contactDetails: null,
        commitmentDeadline: null,
        coveredContracts: ["0xcontract1", "0xcontract2"],
        createdAtBlock: 100,
        createdAt: timestamp,
        rpcFetchedAt: new Date(), // Already fetched — no RPC call
      });

      const result = await service.getAgreement(agreementAddress);

      expect(result).toMatchObject({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        coveredContracts: ["0xcontract1", "0xcontract2"],
        createdAtBlock: 100,
        createdAt: timestamp.getTime(),
      });
      // coveredAccounts comes from the accounts repository which returns empty in this test
      expect(result?.coveredAccounts).toEqual([]);
    });

    it("handles null createdAt", async () => {
      (agreementStateRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        coveredContracts: [],
        createdAtBlock: 100,
        createdAt: null,
        rpcFetchedAt: new Date(),
      });

      const result = await service.getAgreement(agreementAddress);

      expect(result?.createdAt).toBeNull();
    });

    it("normalizes address case", async () => {
      const upperCaseAddress = "0xAGREEMENT123456789012345678901234567890";
      (agreementStateRepository.findOne as jest.Mock).mockResolvedValue(null);

      await service.getAgreement(upperCaseAddress);

      expect(agreementStateRepository.findOne).toHaveBeenCalledWith({
        where: { agreementAddress: upperCaseAddress.toLowerCase() },
      });
    });

    it("skips RPC fetch when no RPC URL is configured", async () => {
      // configService.get returns null (no RPC URL) — default in this test suite
      (agreementStateRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        coveredScopeContracts: [],
        coveredChildContracts: [],
        coveredContracts: [],
        createdAtBlock: 100,
        createdAt: new Date(),
        rpcFetchedAt: null, // Not yet fetched
      });

      const result = await service.getAgreement(agreementAddress);

      // Should return partial data without making RPC call
      expect(result).toBeDefined();
      // update() should NOT have been called (no RPC fetch)
      expect(agreementStateRepository.update).not.toHaveBeenCalled();
    });

    it("skips RPC fetch when rpcFetchedAt is already set", async () => {
      (agreementStateRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        protocolName: "Test Protocol",
        coveredContracts: [],
        createdAtBlock: 100,
        createdAt: new Date(),
        rpcFetchedAt: new Date("2024-06-01T00:00:00Z"),
      });

      const result = await service.getAgreement(agreementAddress);

      expect(result).toBeDefined();
      expect(result?.protocolName).toBe("Test Protocol");
      // update() should NOT have been called (already fetched)
      expect(agreementStateRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("getAgreementsByContract", () => {
    const contractAddress = "0xcontract12345678901234567890123456789012";

    it("returns empty array when no agreement covers the contract", async () => {
      const mockQueryBuilder = mock<SelectQueryBuilder<AgreementCurrentState>>();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([]);
      (agreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.getAgreementsByContract(contractAddress);

      expect(result).toEqual([]);
      expect(agreementStateRepository.createQueryBuilder).toHaveBeenCalledWith("state");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(":address = ANY(state.covered_contracts)", {
        address: contractAddress.toLowerCase(),
      });
    });
  });

  describe("polling / onModuleInit", () => {
    it("does not start polling when no RPC URL is configured", () => {
      jest.useFakeTimers();
      // configService.get returns null — default in this suite
      // Reset call counts after beforeEach setup
      (agreementStateRepository.createQueryBuilder as jest.Mock).mockClear();

      service.onModuleInit();

      // Advance time well past the interval
      jest.advanceTimersByTime(30_000);

      // createQueryBuilder should not have been called for polling
      expect(agreementStateRepository.createQueryBuilder).not.toHaveBeenCalled();

      service.onModuleDestroy();
      jest.useRealTimers();
    });
  });

  describe("fetchPendingAgreementDetails", () => {
    let rpcService: BattlechainService;
    let rpcAgreementStateRepository: Repository<AgreementCurrentState>;
    let rpcAgreementAccountRepository: Repository<AgreementAccount>;

    beforeEach(async () => {
      rpcAgreementStateRepository = mock<Repository<AgreementCurrentState>>();
      rpcAgreementAccountRepository = mock<Repository<AgreementAccount>>();
      const rpcConfigService = mock<ConfigService>();

      // Configure with an RPC URL so rpcProvider is created
      (rpcConfigService.get as jest.Mock).mockReturnValue("http://localhost:3050");

      const mockQb = mock<SelectQueryBuilder<AgreementCurrentState>>();
      mockQb.where.mockReturnValue(mockQb);
      mockQb.take.mockReturnValue(mockQb);
      mockQb.getOne.mockResolvedValue(null);
      mockQb.getMany.mockResolvedValue([]);
      (rpcAgreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQb);

      (rpcAgreementAccountRepository.find as jest.Mock).mockResolvedValue([]);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BattlechainService,
          { provide: ConfigService, useValue: rpcConfigService },
          { provide: DataSource, useValue: mock<DataSource>() },
          { provide: getRepositoryToken(AgreementStateChange), useValue: mock<Repository<AgreementStateChange>>() },
          { provide: getRepositoryToken(AgreementCurrentState), useValue: rpcAgreementStateRepository },
          { provide: getRepositoryToken(AgreementAccount), useValue: rpcAgreementAccountRepository },
          { provide: getRepositoryToken(AgreementOwnerAuthorized), useValue: mock<Repository<AgreementOwnerAuthorized>>() },
          { provide: getRepositoryToken(AttackModeratorTransferred), useValue: mock<Repository<AttackModeratorTransferred>>() },
        ],
      }).compile();

      rpcService = module.get<BattlechainService>(BattlechainService);
    });

    afterEach(() => {
      rpcService.onModuleDestroy();
    });

    it("queries for agreements with rpcFetchedAt IS NULL", async () => {
      const mockQb = mock<SelectQueryBuilder<AgreementCurrentState>>();
      mockQb.where.mockReturnValue(mockQb);
      mockQb.take.mockReturnValue(mockQb);
      mockQb.getMany.mockResolvedValue([]);
      (rpcAgreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQb);

      await rpcService["fetchPendingAgreementDetails"]();

      expect(mockQb.where).toHaveBeenCalledWith("state.rpcFetchedAt IS NULL");
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it("does nothing when no pending agreements found", async () => {
      const mockQb = mock<SelectQueryBuilder<AgreementCurrentState>>();
      mockQb.where.mockReturnValue(mockQb);
      mockQb.take.mockReturnValue(mockQb);
      mockQb.getMany.mockResolvedValue([]);
      (rpcAgreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQb);

      await rpcService["fetchPendingAgreementDetails"]();

      // update should not be called since no pending agreements
      expect(rpcAgreementStateRepository.update).not.toHaveBeenCalled();
    });

    it("handles errors gracefully without throwing", async () => {
      const mockQb = mock<SelectQueryBuilder<AgreementCurrentState>>();
      mockQb.where.mockReturnValue(mockQb);
      mockQb.take.mockReturnValue(mockQb);
      mockQb.getMany.mockRejectedValue(new Error("DB connection failed"));
      (rpcAgreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQb);

      // Should not throw
      await expect(rpcService["fetchPendingAgreementDetails"]()).resolves.toBeUndefined();
    });
  });
});
