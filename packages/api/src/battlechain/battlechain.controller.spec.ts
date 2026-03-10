import { Test, TestingModule } from "@nestjs/testing";
import { mock } from "jest-mock-extended";
import { NotFoundException } from "@nestjs/common";
import { BattlechainController } from "./battlechain.controller";
import { BattlechainService } from "./battlechain.service";
import { ContractStateInfoDto, AgreementDto, PaginatedAgreementsDto } from "./battlechain.dto";

describe("BattlechainController", () => {
  let controller: BattlechainController;
  let serviceMock: BattlechainService;

  beforeEach(async () => {
    serviceMock = mock<BattlechainService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BattlechainController],
      providers: [
        {
          provide: BattlechainService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<BattlechainController>(BattlechainController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("getContractState", () => {
    const contractAddress = "0x1234567890123456789012345678901234567890";

    it("calls service with correct address", async () => {
      const stateInfo: ContractStateInfoDto = {
        state: "REGISTERED",
        wasUnderAttack: false,
        registeredAt: 1704067200000,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      };
      (serviceMock.getContractStateInfo as jest.Mock).mockResolvedValue(stateInfo);

      await controller.getContractState(contractAddress);

      expect(serviceMock.getContractStateInfo).toHaveBeenCalledTimes(1);
      expect(serviceMock.getContractStateInfo).toHaveBeenCalledWith(contractAddress);
    });

    it("returns state info when contract is registered", async () => {
      const stateInfo: ContractStateInfoDto = {
        state: "PRODUCTION",
        wasUnderAttack: true,
        registeredAt: 1704067200000,
        underAttackAt: 1704153600000,
        productionAt: 1704240000000,
        commitmentLockedUntil: null,
      };
      (serviceMock.getContractStateInfo as jest.Mock).mockResolvedValue(stateInfo);

      const result = await controller.getContractState(contractAddress);

      expect(result).toEqual(stateInfo);
    });

    it("returns NOT_REGISTERED state when contract not in AttackRegistry", async () => {
      const stateInfo: ContractStateInfoDto = {
        state: "NOT_REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      };
      (serviceMock.getContractStateInfo as jest.Mock).mockResolvedValue(stateInfo);

      const result = await controller.getContractState(contractAddress);

      expect(result).toEqual(stateInfo);
    });
  });

  describe("getAgreement", () => {
    const agreementAddress = "0xagreement1234567890123456789012345678901";

    it("calls service with correct address", async () => {
      const agreement: AgreementDto = {
        agreementAddress: agreementAddress,
        owner: "0xowner12345678901234567890123456789012345",
        coveredContracts: [],
        createdAtBlock: 100,
        createdAt: 1704067200000,
      };
      (serviceMock.getAgreement as jest.Mock).mockResolvedValue(agreement);

      await controller.getAgreement(agreementAddress);

      expect(serviceMock.getAgreement).toHaveBeenCalledTimes(1);
      expect(serviceMock.getAgreement).toHaveBeenCalledWith(agreementAddress);
    });

    it("returns agreement when found", async () => {
      const agreement: AgreementDto = {
        agreementAddress: agreementAddress,
        owner: "0xowner12345678901234567890123456789012345",
        coveredContracts: ["0xcovered123456789012345678901234567890123"],
        createdAtBlock: 100,
        createdAt: 1704067200000,
      };
      (serviceMock.getAgreement as jest.Mock).mockResolvedValue(agreement);

      const result = await controller.getAgreement(agreementAddress);

      expect(result).toEqual(agreement);
    });

    it("throws NotFoundException when agreement not found", async () => {
      (serviceMock.getAgreement as jest.Mock).mockResolvedValue(null);

      await expect(controller.getAgreement(agreementAddress)).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAgreementByContract", () => {
    const contractAddress = "0xcontract12345678901234567890123456789012";

    it("calls service with correct address", async () => {
      (serviceMock.getAgreementInfoForContract as jest.Mock).mockResolvedValue({
        agreements: [],
        isAgreementContract: false,
      });

      await controller.getAgreementByContract(contractAddress);

      expect(serviceMock.getAgreementInfoForContract).toHaveBeenCalledTimes(1);
      expect(serviceMock.getAgreementInfoForContract).toHaveBeenCalledWith(contractAddress);
    });

    it("returns agreements array with hasCoverage true when covered", async () => {
      const agreement: AgreementDto = {
        agreementAddress: "0xagreement1234567890123456789012345678901",
        owner: "0xowner12345678901234567890123456789012345",
        coveredContracts: [contractAddress],
        createdAtBlock: 100,
        createdAt: 1704067200000,
      };
      (serviceMock.getAgreementInfoForContract as jest.Mock).mockResolvedValue({
        agreements: [agreement],
        isAgreementContract: false,
      });

      const result = await controller.getAgreementByContract(contractAddress);

      expect(result).toEqual({
        agreements: [agreement],
        hasCoverage: true,
        isAgreementContract: false,
      });
    });

    it("returns empty agreements with hasCoverage false when not covered", async () => {
      (serviceMock.getAgreementInfoForContract as jest.Mock).mockResolvedValue({
        agreements: [],
        isAgreementContract: false,
      });

      const result = await controller.getAgreementByContract(contractAddress);

      expect(result).toEqual({
        agreements: [],
        hasCoverage: false,
        isAgreementContract: false,
      });
    });
  });

  describe("getAllAgreements", () => {
    it("calls service method", async () => {
      const paginatedResult: PaginatedAgreementsDto = {
        items: [],
        meta: {
          currentPage: 1,
          itemCount: 0,
          itemsPerPage: 10,
          totalItems: 0,
          totalPages: 0,
        },
      };
      (serviceMock.getAllAgreements as jest.Mock).mockResolvedValue(paginatedResult);

      await controller.getAllAgreements();

      expect(serviceMock.getAllAgreements).toHaveBeenCalledTimes(1);
    });

    it("returns paginated list of agreements from service", async () => {
      const agreements: AgreementDto[] = [
        {
          agreementAddress: "0xagreement1234567890123456789012345678901",
          owner: "0xowner12345678901234567890123456789012345",
          coveredContracts: ["0xcovered123456789012345678901234567890123"],
          createdAtBlock: 100,
          createdAt: 1704067200000,
        },
        {
          agreementAddress: "0xagreement2234567890123456789012345678902",
          owner: "0xowner22345678901234567890123456789012346",
          coveredContracts: [],
          createdAtBlock: 200,
          createdAt: 1704153600000,
        },
      ];
      const paginatedResult: PaginatedAgreementsDto = {
        items: agreements,
        meta: {
          currentPage: 1,
          itemCount: 2,
          itemsPerPage: 10,
          totalItems: 2,
          totalPages: 1,
        },
      };
      (serviceMock.getAllAgreements as jest.Mock).mockResolvedValue(paginatedResult);

      const result = await controller.getAllAgreements();

      expect(result).toEqual(paginatedResult);
    });

    it("returns empty paginated result when no agreements exist", async () => {
      const paginatedResult: PaginatedAgreementsDto = {
        items: [],
        meta: {
          currentPage: 1,
          itemCount: 0,
          itemsPerPage: 10,
          totalItems: 0,
          totalPages: 0,
        },
      };
      (serviceMock.getAllAgreements as jest.Mock).mockResolvedValue(paginatedResult);

      const result = await controller.getAllAgreements();

      expect(result).toEqual(paginatedResult);
    });
  });
});
