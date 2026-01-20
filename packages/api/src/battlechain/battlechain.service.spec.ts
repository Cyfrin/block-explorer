import { Test, TestingModule } from "@nestjs/testing";
import { mock } from "jest-mock-extended";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BattlechainService } from "./battlechain.service";
import { ContractStateChange } from "./contractState.entity";
import { AgreementCreated, AgreementScopeAddressAdded, AgreementScopeAddressRemoved } from "./agreement.entity";
import { ContractState } from "./battlechain.dto";

describe("BattlechainService", () => {
  let service: BattlechainService;
  let contractStateRepository: Repository<ContractStateChange>;
  let agreementCreatedRepository: Repository<AgreementCreated>;
  let scopeAddedRepository: Repository<AgreementScopeAddressAdded>;
  let scopeRemovedRepository: Repository<AgreementScopeAddressRemoved>;

  beforeEach(async () => {
    contractStateRepository = mock<Repository<ContractStateChange>>();
    agreementCreatedRepository = mock<Repository<AgreementCreated>>();
    scopeAddedRepository = mock<Repository<AgreementScopeAddressAdded>>();
    scopeRemovedRepository = mock<Repository<AgreementScopeAddressRemoved>>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattlechainService,
        {
          provide: getRepositoryToken(ContractStateChange),
          useValue: contractStateRepository,
        },
        {
          provide: getRepositoryToken(AgreementCreated),
          useValue: agreementCreatedRepository,
        },
        {
          provide: getRepositoryToken(AgreementScopeAddressAdded),
          useValue: scopeAddedRepository,
        },
        {
          provide: getRepositoryToken(AgreementScopeAddressRemoved),
          useValue: scopeRemovedRepository,
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

    it("returns null when no state changes exist", async () => {
      (contractStateRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result).toBeNull();
      expect(contractStateRepository.find).toHaveBeenCalledWith({
        where: { contractAddress: contractAddress.toLowerCase() },
        order: { blockNumber: "ASC", logIndex: "ASC" },
      });
    });

    it("returns correct state from single NEW_DEPLOYMENT state change", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");
      (contractStateRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: 0,
          blockTimestamp: timestamp,
        },
      ]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result).toEqual({
        state: "NEW_DEPLOYMENT",
        wasUnderAttack: false,
        deployedAt: timestamp.getTime(),
        underAttackAt: null,
        productionAt: null,
      });
    });

    it("correctly processes multiple state changes to PRODUCTION", async () => {
      const deployTime = new Date("2024-01-01T00:00:00Z");
      const productionTime = new Date("2024-01-02T00:00:00Z");

      (contractStateRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: 0,
          blockTimestamp: deployTime,
        },
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.PRODUCTION,
          blockNumber: 200,
          logIndex: 0,
          blockTimestamp: productionTime,
        },
      ]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result).toEqual({
        state: "PRODUCTION",
        wasUnderAttack: false,
        deployedAt: deployTime.getTime(),
        underAttackAt: null,
        productionAt: productionTime.getTime(),
      });
    });

    it("sets wasUnderAttack true when contract went through UNDER_ATTACK state", async () => {
      const deployTime = new Date("2024-01-01T00:00:00Z");
      const attackTime = new Date("2024-01-02T00:00:00Z");
      const productionTime = new Date("2024-01-03T00:00:00Z");

      (contractStateRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: 0,
          blockTimestamp: deployTime,
        },
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.UNDER_ATTACK,
          blockNumber: 200,
          logIndex: 0,
          blockTimestamp: attackTime,
        },
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.PRODUCTION,
          blockNumber: 300,
          logIndex: 0,
          blockTimestamp: productionTime,
        },
      ]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result).toEqual({
        state: "PRODUCTION",
        wasUnderAttack: true,
        deployedAt: deployTime.getTime(),
        underAttackAt: attackTime.getTime(),
        productionAt: productionTime.getTime(),
      });
    });

    it("handles null blockTimestamp", async () => {
      (contractStateRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.NEW_DEPLOYMENT,
          blockNumber: 100,
          logIndex: 0,
          blockTimestamp: null,
        },
      ]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result).toEqual({
        state: "NEW_DEPLOYMENT",
        wasUnderAttack: false,
        deployedAt: null,
        underAttackAt: null,
        productionAt: null,
      });
    });

    it("normalizes address case (uppercase input)", async () => {
      const upperCaseAddress = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      (contractStateRepository.find as jest.Mock).mockResolvedValue([]);

      await service.getContractStateInfo(upperCaseAddress);

      expect(contractStateRepository.find).toHaveBeenCalledWith({
        where: { contractAddress: upperCaseAddress.toLowerCase() },
        order: { blockNumber: "ASC", logIndex: "ASC" },
      });
    });

    it("normalizes address case (mixed case input)", async () => {
      const mixedCaseAddress = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12";
      (contractStateRepository.find as jest.Mock).mockResolvedValue([]);

      await service.getContractStateInfo(mixedCaseAddress);

      expect(contractStateRepository.find).toHaveBeenCalledWith({
        where: { contractAddress: mixedCaseAddress.toLowerCase() },
        order: { blockNumber: "ASC", logIndex: "ASC" },
      });
    });
  });

  describe("getAgreement", () => {
    const agreementAddress = "0xagreement1234567890123456789012345678901";
    const ownerAddress = "0xowner12345678901234567890123456789012345";

    it("returns null when agreement doesn't exist", async () => {
      (agreementCreatedRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.getAgreement(agreementAddress);

      expect(result).toBeNull();
      expect(agreementCreatedRepository.findOne).toHaveBeenCalledWith({
        where: { agreementAddress: agreementAddress.toLowerCase() },
      });
    });

    it("returns agreement with covered contracts", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");
      const coveredContract = "0xcovered123456789012345678901234567890123";

      (agreementCreatedRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        blockNumber: 100,
        blockTimestamp: timestamp,
      });

      (scopeAddedRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: agreementAddress.toLowerCase(),
          addr: coveredContract.toLowerCase(),
          blockNumber: 101,
          logIndex: 0,
        },
      ]);

      (scopeRemovedRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getAgreement(agreementAddress);

      expect(result).toEqual({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        coveredContracts: [coveredContract.toLowerCase()],
        createdAtBlock: 100,
        createdAt: timestamp.getTime(),
      });
    });

    it("returns agreement with no covered contracts", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");

      (agreementCreatedRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        blockNumber: 100,
        blockTimestamp: timestamp,
      });

      (scopeAddedRepository.find as jest.Mock).mockResolvedValue([]);
      (scopeRemovedRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getAgreement(agreementAddress);

      expect(result).toEqual({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        coveredContracts: [],
        createdAtBlock: 100,
        createdAt: timestamp.getTime(),
      });
    });

    it("handles null blockTimestamp", async () => {
      (agreementCreatedRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        blockNumber: 100,
        blockTimestamp: null,
      });

      (scopeAddedRepository.find as jest.Mock).mockResolvedValue([]);
      (scopeRemovedRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getAgreement(agreementAddress);

      expect(result?.createdAt).toBeNull();
    });

    it("normalizes address case", async () => {
      const upperCaseAddress = "0xAGREEMENT123456789012345678901234567890";
      (agreementCreatedRepository.findOne as jest.Mock).mockResolvedValue(null);

      await service.getAgreement(upperCaseAddress);

      expect(agreementCreatedRepository.findOne).toHaveBeenCalledWith({
        where: { agreementAddress: upperCaseAddress.toLowerCase() },
      });
    });

    it("excludes removed contracts from covered list", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");
      const coveredContract1 = "0xcovered123456789012345678901234567890111";
      const removedContract = "0xcovered123456789012345678901234567890222";

      (agreementCreatedRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        blockNumber: 100,
        blockTimestamp: timestamp,
      });

      (scopeAddedRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: agreementAddress.toLowerCase(),
          addr: coveredContract1.toLowerCase(),
          blockNumber: 101,
          logIndex: 0,
        },
        {
          contractAddress: agreementAddress.toLowerCase(),
          addr: removedContract.toLowerCase(),
          blockNumber: 102,
          logIndex: 0,
        },
      ]);

      (scopeRemovedRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: agreementAddress.toLowerCase(),
          addr: removedContract.toLowerCase(),
          blockNumber: 103,
          logIndex: 0,
        },
      ]);

      const result = await service.getAgreement(agreementAddress);

      expect(result?.coveredContracts).toEqual([coveredContract1.toLowerCase()]);
    });
  });

  describe("getAgreementByContract", () => {
    const contractAddress = "0xcontract12345678901234567890123456789012";
    const agreementAddress = "0xagreement1234567890123456789012345678901";
    const ownerAddress = "0xowner12345678901234567890123456789012345";

    it("returns null when contract not covered by any agreement", async () => {
      (scopeAddedRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getAgreementByContract(contractAddress);

      expect(result).toBeNull();
      expect(scopeAddedRepository.find).toHaveBeenCalledWith({
        where: { addr: contractAddress.toLowerCase() },
        order: { blockNumber: "DESC", logIndex: "DESC" },
      });
    });

    it("returns agreement when contract is in scope", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");

      (scopeAddedRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: agreementAddress.toLowerCase(),
          addr: contractAddress.toLowerCase(),
          blockNumber: 101,
          logIndex: 0,
        },
      ]);

      (scopeRemovedRepository.findOne as jest.Mock).mockResolvedValue(null);

      (agreementCreatedRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        blockNumber: 100,
        blockTimestamp: timestamp,
      });

      (scopeAddedRepository.find as jest.Mock)
        .mockResolvedValueOnce([
          {
            contractAddress: agreementAddress.toLowerCase(),
            addr: contractAddress.toLowerCase(),
            blockNumber: 101,
            logIndex: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            contractAddress: agreementAddress.toLowerCase(),
            addr: contractAddress.toLowerCase(),
            blockNumber: 101,
            logIndex: 0,
          },
        ]);

      (scopeRemovedRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getAgreementByContract(contractAddress);

      expect(result).not.toBeNull();
      expect(result?.agreementAddress).toBe(agreementAddress.toLowerCase());
    });

    it("returns null when contract was added then removed", async () => {
      (scopeAddedRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: agreementAddress.toLowerCase(),
          addr: contractAddress.toLowerCase(),
          blockNumber: 101,
          logIndex: 0,
        },
      ]);

      (scopeRemovedRepository.findOne as jest.Mock).mockResolvedValue({
        contractAddress: agreementAddress.toLowerCase(),
        addr: contractAddress.toLowerCase(),
        blockNumber: 102,
        logIndex: 0,
      });

      const result = await service.getAgreementByContract(contractAddress);

      expect(result).toBeNull();
    });

    it("returns agreement when removal happened before addition", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");

      (scopeAddedRepository.find as jest.Mock).mockResolvedValueOnce([
        {
          contractAddress: agreementAddress.toLowerCase(),
          addr: contractAddress.toLowerCase(),
          blockNumber: 102,
          logIndex: 0,
        },
      ]);

      (scopeRemovedRepository.findOne as jest.Mock).mockResolvedValue({
        contractAddress: agreementAddress.toLowerCase(),
        addr: contractAddress.toLowerCase(),
        blockNumber: 100,
        logIndex: 0,
      });

      (agreementCreatedRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        blockNumber: 90,
        blockTimestamp: timestamp,
      });

      (scopeAddedRepository.find as jest.Mock).mockResolvedValueOnce([
        {
          contractAddress: agreementAddress.toLowerCase(),
          addr: contractAddress.toLowerCase(),
          blockNumber: 102,
          logIndex: 0,
        },
      ]);

      (scopeRemovedRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getAgreementByContract(contractAddress);

      expect(result).not.toBeNull();
    });

    it("normalizes address case", async () => {
      const upperCaseAddress = "0xCONTRACT123456789012345678901234567890";
      (scopeAddedRepository.find as jest.Mock).mockResolvedValue([]);

      await service.getAgreementByContract(upperCaseAddress);

      expect(scopeAddedRepository.find).toHaveBeenCalledWith({
        where: { addr: upperCaseAddress.toLowerCase() },
        order: { blockNumber: "DESC", logIndex: "DESC" },
      });
    });

    it("skips added events with null contractAddress", async () => {
      (scopeAddedRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: null,
          addr: contractAddress.toLowerCase(),
          blockNumber: 101,
          logIndex: 0,
        },
      ]);

      const result = await service.getAgreementByContract(contractAddress);

      expect(result).toBeNull();
      expect(scopeRemovedRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe("getAllAgreements", () => {
    it("returns empty array when no agreements exist", async () => {
      (agreementCreatedRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getAllAgreements();

      expect(result).toEqual([]);
      expect(agreementCreatedRepository.find).toHaveBeenCalledWith({
        order: { blockNumber: "DESC" },
      });
    });

    it("returns all agreements with their covered contracts", async () => {
      const timestamp1 = new Date("2024-01-01T00:00:00Z");
      const timestamp2 = new Date("2024-01-02T00:00:00Z");
      const agreement1 = "0xagreement1234567890123456789012345678901";
      const agreement2 = "0xagreement2234567890123456789012345678902";
      const owner1 = "0xowner12345678901234567890123456789012345";
      const owner2 = "0xowner22345678901234567890123456789012346";
      const covered1 = "0xcovered123456789012345678901234567890123";

      (agreementCreatedRepository.find as jest.Mock).mockResolvedValue([
        {
          agreementAddress: agreement1.toLowerCase(),
          owner: owner1.toLowerCase(),
          blockNumber: 200,
          blockTimestamp: timestamp2,
        },
        {
          agreementAddress: agreement2.toLowerCase(),
          owner: owner2.toLowerCase(),
          blockNumber: 100,
          blockTimestamp: timestamp1,
        },
      ]);

      (scopeAddedRepository.find as jest.Mock).mockImplementation(({ where }) => {
        if (where.contractAddress === agreement1.toLowerCase()) {
          return Promise.resolve([
            {
              contractAddress: agreement1.toLowerCase(),
              addr: covered1.toLowerCase(),
              blockNumber: 201,
              logIndex: 0,
            },
          ]);
        }
        return Promise.resolve([]);
      });

      (scopeRemovedRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getAllAgreements();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        agreementAddress: agreement1.toLowerCase(),
        owner: owner1.toLowerCase(),
        coveredContracts: [covered1.toLowerCase()],
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
