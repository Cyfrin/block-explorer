import { Test, TestingModule } from "@nestjs/testing";
import { mock } from "jest-mock-extended";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BattlechainService } from "./battlechain.service";
import { ContractStateChange } from "./contractState.entity";
import { AgreementCreated } from "./agreement.entity";
import { ContractState } from "./battlechain.dto";

describe("BattlechainService", () => {
  let service: BattlechainService;
  let contractStateRepository: Repository<ContractStateChange>;
  let agreementCreatedRepository: Repository<AgreementCreated>;

  beforeEach(async () => {
    contractStateRepository = mock<Repository<ContractStateChange>>();
    agreementCreatedRepository = mock<Repository<AgreementCreated>>();

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
      ],
    }).compile();

    service = module.get<BattlechainService>(BattlechainService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("getContractStateInfo", () => {
    const contractAddress = "0x1234567890123456789012345678901234567890";

    it("returns NOT_REGISTERED when no state changes exist", async () => {
      (contractStateRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result).toEqual({
        state: "NOT_REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
        underAttackAt: null,
        productionAt: null,
      });
      expect(contractStateRepository.find).toHaveBeenCalledWith({
        where: { contractAddress: contractAddress.toLowerCase() },
        order: { blockNumber: "ASC", logIndex: "ASC" },
      });
    });

    it("returns correct state from single REGISTERED state change", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");
      (contractStateRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.REGISTERED,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: timestamp,
        },
      ]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result).toEqual({
        state: "REGISTERED",
        wasUnderAttack: false,
        registeredAt: timestamp.getTime(),
        underAttackAt: null,
        productionAt: null,
      });
    });

    it("correctly processes multiple state changes to PRODUCTION", async () => {
      const registeredTime = new Date("2024-01-01T00:00:00Z");
      const productionTime = new Date("2024-01-02T00:00:00Z");

      (contractStateRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.REGISTERED,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredTime,
        },
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.PRODUCTION,
          blockNumber: 200,
          logIndex: "0",
          blockTimestamp: productionTime,
        },
      ]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result).toEqual({
        state: "PRODUCTION",
        wasUnderAttack: false,
        registeredAt: registeredTime.getTime(),
        underAttackAt: null,
        productionAt: productionTime.getTime(),
      });
    });

    it("sets wasUnderAttack true when contract went through UNDER_ATTACK state", async () => {
      const registeredTime = new Date("2024-01-01T00:00:00Z");
      const attackTime = new Date("2024-01-02T00:00:00Z");
      const productionTime = new Date("2024-01-03T00:00:00Z");

      (contractStateRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.REGISTERED,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: registeredTime,
        },
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.UNDER_ATTACK,
          blockNumber: 200,
          logIndex: "0",
          blockTimestamp: attackTime,
        },
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.PRODUCTION,
          blockNumber: 300,
          logIndex: "0",
          blockTimestamp: productionTime,
        },
      ]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result).toEqual({
        state: "PRODUCTION",
        wasUnderAttack: true,
        registeredAt: registeredTime.getTime(),
        underAttackAt: attackTime.getTime(),
        productionAt: productionTime.getTime(),
      });
    });

    it("handles null blockTimestamp", async () => {
      (contractStateRepository.find as jest.Mock).mockResolvedValue([
        {
          contractAddress: contractAddress.toLowerCase(),
          newState: ContractState.REGISTERED,
          blockNumber: 100,
          logIndex: "0",
          blockTimestamp: null,
        },
      ]);

      const result = await service.getContractStateInfo(contractAddress);

      expect(result).toEqual({
        state: "REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
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

    it("returns agreement with empty covered contracts (scope events not yet indexed)", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");

      (agreementCreatedRepository.findOne as jest.Mock).mockResolvedValue({
        agreementAddress: agreementAddress.toLowerCase(),
        owner: ownerAddress.toLowerCase(),
        blockNumber: 100,
        blockTimestamp: timestamp,
      });

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
  });

  describe("getAgreementByContract", () => {
    const contractAddress = "0xcontract12345678901234567890123456789012";

    it("returns null (scope events not yet indexed)", async () => {
      const result = await service.getAgreementByContract(contractAddress);

      expect(result).toBeNull();
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

    it("returns all agreements with empty covered contracts", async () => {
      const timestamp1 = new Date("2024-01-01T00:00:00Z");
      const timestamp2 = new Date("2024-01-02T00:00:00Z");
      const agreement1 = "0xagreement1234567890123456789012345678901";
      const agreement2 = "0xagreement2234567890123456789012345678902";
      const owner1 = "0xowner12345678901234567890123456789012345";
      const owner2 = "0xowner22345678901234567890123456789012346";

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

      const result = await service.getAllAgreements();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        agreementAddress: agreement1.toLowerCase(),
        owner: owner1.toLowerCase(),
        coveredContracts: [],
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
