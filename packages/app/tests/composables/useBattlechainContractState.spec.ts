import { ref } from "vue";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { $fetch } from "ohmyfetch";

import { useContextMock } from "../mocks";

import useBattlechainContractState from "@/composables/useBattlechainContractState";

import type { BattlechainContractStateInfo } from "@/composables/useBattlechainContractState";
import type { SpyInstance } from "vitest";

vi.mock("ohmyfetch", () => {
  const fetchSpy = vi.fn(() => Promise.resolve({}));
  (fetchSpy as unknown as { create: SpyInstance }).create = vi.fn(() => fetchSpy);
  return {
    $fetch: fetchSpy,
    FetchError: function error() {
      return;
    },
  };
});

describe("useBattlechainContractState:", () => {
  let mockContext: SpyInstance;

  beforeEach(() => {
    mockContext = useContextMock();
  });

  afterEach(() => {
    mockContext?.mockRestore();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("creates composable with all expected properties", () => {
      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      expect(result.stateInfo).toBeDefined();
      expect(result.isLoading).toBeDefined();
      expect(result.error).toBeDefined();
      expect(result.hasStateInfo).toBeDefined();
      expect(result.state).toBeDefined();
      expect(result.isNotRegistered).toBeDefined();
      expect(result.wasUnderAttack).toBeDefined();
      expect(result.registeredAt).toBeDefined();
      expect(result.underAttackAt).toBeDefined();
      expect(result.productionAt).toBeDefined();
      expect(result.commitmentLockedUntil).toBeDefined();
      expect(result.attackDetails).toBeDefined();
      expect(result.fetch).toBeDefined();
    });

    it("initializes with default values", () => {
      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      expect(result.stateInfo.value).toBeNull();
      expect(result.isLoading.value).toBe(false);
      expect(result.error.value).toBeNull();
      expect(result.hasStateInfo.value).toBe(false);
      expect(result.state.value).toBeNull();
      expect(result.isNotRegistered.value).toBe(false);
      expect(result.wasUnderAttack.value).toBe(false);
      expect(result.registeredAt.value).toBeNull();
      expect(result.underAttackAt.value).toBeNull();
      expect(result.productionAt.value).toBeNull();
      expect(result.commitmentLockedUntil.value).toBeNull();
      expect(result.attackDetails.value).toBeNull();
    });
  });

  describe("fetch - successful responses", () => {
    it("fetches and sets NOT_REGISTERED state", async () => {
      const mockResponse: BattlechainContractStateInfo = {
        state: "NOT_REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockResolvedValueOnce(mockResponse);

      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      await result.fetch();

      expect(result.stateInfo.value).toEqual(mockResponse);
      expect(result.hasStateInfo.value).toBe(true);
      expect(result.state.value).toBe("NOT_REGISTERED");
      expect(result.isNotRegistered.value).toBe(true);
      expect(result.wasUnderAttack.value).toBe(false);
      expect(result.error.value).toBeNull();
    });

    it("fetches and sets REGISTERED state with timestamps", async () => {
      const mockResponse: BattlechainContractStateInfo = {
        state: "REGISTERED",
        wasUnderAttack: false,
        registeredAt: 1700000000000,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: 1700604800000, // 7 days later
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockResolvedValueOnce(mockResponse);

      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      await result.fetch();

      expect(result.state.value).toBe("REGISTERED");
      expect(result.isNotRegistered.value).toBe(false);
      expect(result.registeredAt.value).toBe(1700000000000);
      expect(result.commitmentLockedUntil.value).toBe(1700604800000);
    });

    it("fetches and sets UNDER_ATTACK state with attack details", async () => {
      const mockResponse: BattlechainContractStateInfo = {
        state: "UNDER_ATTACK",
        wasUnderAttack: true,
        registeredAt: 1700000000000,
        underAttackAt: 1700100000000,
        productionAt: null,
        commitmentLockedUntil: 1700604800000,
        attackDetails: {
          attackerAddress: "0xAttackerAddress1234567890123456789012",
          attackRegisteredAt: 1700100000000,
          attackType: "REENTRANCY",
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockResolvedValueOnce(mockResponse);

      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      await result.fetch();

      expect(result.state.value).toBe("UNDER_ATTACK");
      expect(result.wasUnderAttack.value).toBe(true);
      expect(result.underAttackAt.value).toBe(1700100000000);
      expect(result.attackDetails.value).toEqual({
        attackerAddress: "0xAttackerAddress1234567890123456789012",
        attackRegisteredAt: 1700100000000,
        attackType: "REENTRANCY",
      });
    });

    it("fetches and sets PRODUCTION state", async () => {
      const mockResponse: BattlechainContractStateInfo = {
        state: "PRODUCTION",
        wasUnderAttack: true,
        registeredAt: 1700000000000,
        underAttackAt: 1700100000000,
        productionAt: 1700200000000,
        commitmentLockedUntil: null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockResolvedValueOnce(mockResponse);

      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      await result.fetch();

      expect(result.state.value).toBe("PRODUCTION");
      expect(result.wasUnderAttack.value).toBe(true);
      expect(result.productionAt.value).toBe(1700200000000);
    });
  });

  describe("fetch - loading state", () => {
    it("sets isLoading to true while request is pending", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockReturnValueOnce(pendingPromise);

      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      const fetchPromise = result.fetch();
      expect(result.isLoading.value).toBe(true);

      resolvePromise!({
        state: "NOT_REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      });
      await fetchPromise;

      expect(result.isLoading.value).toBe(false);
    });

    it("sets isLoading to false after request completes", async () => {
      const mockResponse: BattlechainContractStateInfo = {
        state: "REGISTERED",
        wasUnderAttack: false,
        registeredAt: 1700000000000,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockResolvedValueOnce(mockResponse);

      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      await result.fetch();

      expect(result.isLoading.value).toBe(false);
    });
  });

  describe("fetch - error handling", () => {
    it("sets error message when request fails with Error", async () => {
      const errorMessage = "Network error occurred";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockRejectedValueOnce(new Error(errorMessage));

      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      await result.fetch();

      expect(result.error.value).toBe(errorMessage);
      expect(result.stateInfo.value).toBeNull();
      expect(result.hasStateInfo.value).toBe(false);
      expect(result.isLoading.value).toBe(false);
    });

    it("sets default error message when request fails with non-Error", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockRejectedValueOnce("Some string error");

      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      await result.fetch();

      expect(result.error.value).toBe("Failed to fetch contract state");
      expect(result.stateInfo.value).toBeNull();
    });

    it("clears error on subsequent successful fetch", async () => {
      // First request fails
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockRejectedValueOnce(new Error("First error"));

      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      await result.fetch();
      expect(result.error.value).toBe("First error");

      // Second request succeeds
      const mockResponse: BattlechainContractStateInfo = {
        state: "REGISTERED",
        wasUnderAttack: false,
        registeredAt: 1700000000000,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockResolvedValueOnce(mockResponse);

      await result.fetch();

      expect(result.error.value).toBeNull();
      expect(result.stateInfo.value).toEqual(mockResponse);
    });

    it("sets isLoading to false even when request fails", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockRejectedValueOnce(new Error("Request failed"));

      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      await result.fetch();

      expect(result.isLoading.value).toBe(false);
    });
  });

  describe("computed properties with null stateInfo", () => {
    it("returns fallback values when stateInfo is null", () => {
      const contractAddress = ref("0x1234567890123456789012345678901234567890");
      const result = useBattlechainContractState(contractAddress);

      // Don't call fetch - stateInfo remains null
      expect(result.state.value).toBeNull();
      expect(result.isNotRegistered.value).toBe(false);
      expect(result.wasUnderAttack.value).toBe(false);
      expect(result.registeredAt.value).toBeNull();
      expect(result.underAttackAt.value).toBeNull();
      expect(result.productionAt.value).toBeNull();
      expect(result.commitmentLockedUntil.value).toBeNull();
      expect(result.attackDetails.value).toBeNull();
    });
  });

  describe("API endpoint", () => {
    it("calls correct API endpoint with contract address", async () => {
      const mockResponse: BattlechainContractStateInfo = {
        state: "REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockResolvedValueOnce(mockResponse);

      const contractAddress = ref("0xABCDEF1234567890ABCDEF1234567890ABCDEF12");
      const result = useBattlechainContractState(contractAddress);

      await result.fetch();

      expect($fetch).toHaveBeenCalledWith("/battlechain/contract-state/0xABCDEF1234567890ABCDEF1234567890ABCDEF12");
    });

    it("uses updated contract address on subsequent fetches", async () => {
      const mockResponse: BattlechainContractStateInfo = {
        state: "REGISTERED",
        wasUnderAttack: false,
        registeredAt: null,
        underAttackAt: null,
        productionAt: null,
        commitmentLockedUntil: null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($fetch as any).mockResolvedValue(mockResponse);

      const contractAddress = ref("0x1111111111111111111111111111111111111111");
      const result = useBattlechainContractState(contractAddress);

      await result.fetch();
      expect($fetch).toHaveBeenCalledWith("/battlechain/contract-state/0x1111111111111111111111111111111111111111");

      // Update contract address
      contractAddress.value = "0x2222222222222222222222222222222222222222";
      await result.fetch();

      expect($fetch).toHaveBeenCalledWith("/battlechain/contract-state/0x2222222222222222222222222222222222222222");
    });
  });
});
