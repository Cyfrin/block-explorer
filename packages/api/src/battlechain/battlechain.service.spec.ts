import { Test, TestingModule } from "@nestjs/testing";
import { mock } from "jest-mock-extended";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { BattlechainService } from "./battlechain.service";
import { AgreementStateChange } from "./agreementState.entity";
import { AgreementCreated } from "./agreement.entity";
import { AgreementScope } from "./agreementScope.entity";
import { AgreementCurrentState } from "./agreementCurrentState.entity";
import { ContractState } from "./battlechain.dto";

describe("BattlechainService", () => {
  let service: BattlechainService;
  let agreementStateChangeRepository: Repository<AgreementStateChange>;
  let agreementCreatedRepository: Repository<AgreementCreated>;
  let agreementScopeRepository: Repository<AgreementScope>;
  let agreementStateRepository: Repository<AgreementCurrentState>;

  beforeEach(async () => {
    agreementStateChangeRepository = mock<Repository<AgreementStateChange>>();
    agreementCreatedRepository = mock<Repository<AgreementCreated>>();
    agreementScopeRepository = mock<Repository<AgreementScope>>();
    agreementStateRepository = mock<Repository<AgreementCurrentState>>();

    // Mock createQueryBuilder for agreementStateRepository
    const mockQueryBuilder = mock<SelectQueryBuilder<AgreementCurrentState>>();
    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.getOne.mockResolvedValue(null);
    (agreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattlechainService,
        {
          provide: getRepositoryToken(AgreementStateChange),
          useValue: agreementStateChangeRepository,
        },
        {
          provide: getRepositoryToken(AgreementCreated),
          useValue: agreementCreatedRepository,
        },
        {
          provide: getRepositoryToken(AgreementScope),
          useValue: agreementScopeRepository,
        },
        {
          provide: getRepositoryToken(AgreementCurrentState),
          useValue: agreementStateRepository,
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
      const timestamp = new Date("2024-01-01T00:00:00Z");

      // Mock finding the agreement that covers this contract
      const mockQueryBuilder = mock<SelectQueryBuilder<AgreementCurrentState>>();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: "0xowner",
        coveredContracts: [contractAddress.toLowerCase()],
        createdAtBlock: 100,
        createdAt: timestamp,
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
      });
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
        underAttackAt: null,
        productionAt: null,
        attackRequestedAt: null,
        promotionRequestedAt: null,
        corruptedAt: null,
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
      });

      const result = await service.getAgreement(agreementAddress);

      expect(result).toEqual({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        coveredContracts: ["0xcontract1", "0xcontract2"],
        createdAtBlock: 100,
        createdAt: timestamp.getTime(),
      });
    });

    it("handles null createdAt", async () => {
      (agreementStateRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        coveredContracts: [],
        createdAtBlock: 100,
        createdAt: null,
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
  });

  describe("getAgreementByContract", () => {
    const contractAddress = "0xcontract12345678901234567890123456789012";

    it("returns null when no agreement covers the contract", async () => {
      const mockQueryBuilder = mock<SelectQueryBuilder<AgreementCurrentState>>();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      (agreementStateRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.getAgreementByContract(contractAddress);

      expect(result).toBeNull();
      expect(agreementStateRepository.createQueryBuilder).toHaveBeenCalledWith("state");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(":address = ANY(state.covered_contracts)", {
        address: contractAddress.toLowerCase(),
      });
    });
  });

  describe("getAllAgreements", () => {
    it("returns empty array when no agreements exist", async () => {
      (agreementStateRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getAllAgreements();

      expect(result).toEqual([]);
      expect(agreementStateRepository.find).toHaveBeenCalledWith({
        order: { createdAtBlock: "DESC" },
      });
    });

    it("returns all agreements with their covered contracts", async () => {
      const timestamp1 = new Date("2024-01-01T00:00:00Z");
      const timestamp2 = new Date("2024-01-02T00:00:00Z");
      const agreement1 = "0xagreement1234567890123456789012345678901";
      const agreement2 = "0xagreement2234567890123456789012345678902";
      const owner1 = "0xowner12345678901234567890123456789012345";
      const owner2 = "0xowner22345678901234567890123456789012346";

      (agreementStateRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreement1.toLowerCase(),
          owner: owner1.toLowerCase(),
          coveredContracts: ["0xcontract1"],
          createdAtBlock: 200,
          createdAt: timestamp2,
        },
        {
          agreementAddress: agreement2.toLowerCase(),
          owner: owner2.toLowerCase(),
          coveredContracts: [],
          createdAtBlock: 100,
          createdAt: timestamp1,
        },
      ]);

      const result = await service.getAllAgreements();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        agreementAddress: agreement1.toLowerCase(),
        owner: owner1.toLowerCase(),
        coveredContracts: ["0xcontract1"],
        createdAtBlock: 200,
        createdAt: timestamp2.getTime(),
      });
      expect(result[1]).toEqual({
        agreementAddress: agreement2.toLowerCase(),
        owner: owner2.toLowerCase(),
        coveredContracts: [],
        createdAtBlock: 100,
        createdAt: timestamp1.getTime(),
      });
    });
  });
});
