import { Test, TestingModule } from "@nestjs/testing";
import { mock } from "jest-mock-extended";
import { NotFoundException } from "@nestjs/common";
import { BattlechainController } from "./battlechain.controller";
import { BattlechainService } from "./battlechain.service";
import { ContractStateInfoDto, AgreementDto } from "./battlechain.dto";

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
        state: "NEW_DEPLOYMENT",
        wasUnderAttack: false,
        deployedAt: 1704067200000,
        underAttackAt: null,
        productionAt: null,
      };
      (serviceMock.getContractStateInfo as jest.Mock).mockResolvedValue(stateInfo);

      await controller.getContractState(contractAddress);

      expect(serviceMock.getContractStateInfo).toHaveBeenCalledTimes(1);
      expect(serviceMock.getContractStateInfo).toHaveBeenCalledWith(contractAddress);
    });

    it("returns state info when found", async () => {
      const stateInfo: ContractStateInfoDto = {
        state: "PRODUCTION",
        wasUnderAttack: true,
        deployedAt: 1704067200000,
        underAttackAt: 1704153600000,
        productionAt: 1704240000000,
      };
      (serviceMock.getContractStateInfo as jest.Mock).mockResolvedValue(stateInfo);

      const result = await controller.getContractState(contractAddress);

      expect(result).toEqual(stateInfo);
    });

    it("throws NotFoundException when state not found", async () => {
      (serviceMock.getContractStateInfo as jest.Mock).mockResolvedValue(null);

      await expect(controller.getContractState(contractAddress)).rejects.toThrow(NotFoundException);
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
      (serviceMock.getAgreementByContract as jest.Mock).mockResolvedValue(null);

      await controller.getAgreementByContract(contractAddress);

      expect(serviceMock.getAgreementByContract).toHaveBeenCalledTimes(1);
      expect(serviceMock.getAgreementByContract).toHaveBeenCalledWith(contractAddress);
    });

    it("returns agreement info with hasCoverage true when covered", async () => {
      const agreement: AgreementDto = {
        agreementAddress: "0xagreement1234567890123456789012345678901",
        owner: "0xowner12345678901234567890123456789012345",
        coveredContracts: [contractAddress],
        createdAtBlock: 100,
        createdAt: 1704067200000,
      };
      (serviceMock.getAgreementByContract as jest.Mock).mockResolvedValue(agreement);

      const result = await controller.getAgreementByContract(contractAddress);

      expect(result).toEqual({
        agreement,
        hasCoverage: true,
      });
    });

    it("returns null agreement with hasCoverage false when not covered", async () => {
      (serviceMock.getAgreementByContract as jest.Mock).mockResolvedValue(null);

      const result = await controller.getAgreementByContract(contractAddress);

      expect(result).toEqual({
        agreement: null,
        hasCoverage: false,
      });
    });
  });

  describe("getAllAgreements", () => {
    it("calls service method", async () => {
      (serviceMock.getAllAgreements as jest.Mock).mockResolvedValue([]);

      await controller.getAllAgreements();

      expect(serviceMock.getAllAgreements).toHaveBeenCalledTimes(1);
    });

    it("returns list of agreements from service", async () => {
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
      (serviceMock.getAllAgreements as jest.Mock).mockResolvedValue(agreements);

      const result = await controller.getAllAgreements();

      expect(result).toEqual(agreements);
    });

    it("returns empty array when no agreements exist", async () => {
      (serviceMock.getAllAgreements as jest.Mock).mockResolvedValue([]);

      const result = await controller.getAllAgreements();

      expect(result).toEqual([]);
    });
  });
});
