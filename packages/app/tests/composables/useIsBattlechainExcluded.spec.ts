import { computed, ref } from "vue";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TESTNET_NETWORK } from "../mocks";

import * as useContext from "@/composables/useContext";
import useIsBattlechainExcluded from "@/composables/useIsBattlechainExcluded";

import type { NetworkConfig } from "@/configs";
import type { SpyInstance } from "vitest";

describe("useIsBattlechainExcluded:", () => {
  let mockContext: SpyInstance;

  const createMockContext = (excludedAddresses: string[] = []) => {
    const networkWithExclusions: NetworkConfig = {
      ...TESTNET_NETWORK,
      excludedFromBattlechain: excludedAddresses,
    };

    return vi.spyOn(useContext, "default").mockReturnValue({
      getL2Provider: () => vi.fn(() => null),
      currentNetwork: computed(() => networkWithExclusions),
      user: computed(() => ({
        address: "0x000000000000000000000000000000000000800A",
        loggedIn: true,
      })),
      identifyNetwork: () => undefined,
      isReady: computed(() => true),
      networks: computed(() => [networkWithExclusions]),
      isGatewaySettlementChain: () => false,
    });
  };

  afterEach(() => {
    mockContext?.mockRestore();
  });

  describe("when contract address is in excludedFromBattlechain list", () => {
    const excludedAddress = "0x0000000000000000000000000000000000008001";

    beforeEach(() => {
      mockContext = createMockContext([excludedAddress]);
    });

    it("returns isExcluded as true", () => {
      const contractAddress = ref(excludedAddress);
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(true);
    });

    it("handles case-insensitive matching (lowercase input)", () => {
      const contractAddress = ref(excludedAddress.toLowerCase());
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(true);
    });

    it("handles case-insensitive matching (uppercase input)", () => {
      const contractAddress = ref(excludedAddress.toUpperCase());
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(true);
    });

    it("handles checksummed addresses", () => {
      // Mix of upper and lower case (checksummed format)
      const checksummedAddress = "0x0000000000000000000000000000000000008001";
      const contractAddress = ref(checksummedAddress);
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(true);
    });
  });

  describe("when contract address is NOT in excludedFromBattlechain list", () => {
    const excludedAddress = "0x0000000000000000000000000000000000008001";
    const nonExcludedAddress = "0x1234567890123456789012345678901234567890";

    beforeEach(() => {
      mockContext = createMockContext([excludedAddress]);
    });

    it("returns isExcluded as false", () => {
      const contractAddress = ref(nonExcludedAddress);
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(false);
    });
  });

  describe("when excludedFromBattlechain is empty", () => {
    beforeEach(() => {
      mockContext = createMockContext([]);
    });

    it("returns isExcluded as false for any address", () => {
      const contractAddress = ref("0x0000000000000000000000000000000000008001");
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(false);
    });
  });

  describe("when excludedFromBattlechain is undefined", () => {
    beforeEach(() => {
      // Create a mock without excludedFromBattlechain property
      mockContext = vi.spyOn(useContext, "default").mockReturnValue({
        getL2Provider: () => vi.fn(() => null),
        currentNetwork: computed(() => TESTNET_NETWORK), // No excludedFromBattlechain
        user: computed(() => ({
          address: "0x000000000000000000000000000000000000800A",
          loggedIn: true,
        })),
        identifyNetwork: () => undefined,
        isReady: computed(() => true),
        networks: computed(() => [TESTNET_NETWORK]),
        isGatewaySettlementChain: () => false,
      });
    });

    it("returns isExcluded as false for any address", () => {
      const contractAddress = ref("0x0000000000000000000000000000000000008001");
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(false);
    });
  });

  describe("with multiple excluded addresses", () => {
    const excludedAddresses = [
      "0x0000000000000000000000000000000000008001",
      "0x0000000000000000000000000000000000008002",
      "0x0000000000000000000000000000000000008003",
    ];

    beforeEach(() => {
      mockContext = createMockContext(excludedAddresses);
    });

    it("returns isExcluded as true for first excluded address", () => {
      const contractAddress = ref(excludedAddresses[0]);
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(true);
    });

    it("returns isExcluded as true for middle excluded address", () => {
      const contractAddress = ref(excludedAddresses[1]);
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(true);
    });

    it("returns isExcluded as true for last excluded address", () => {
      const contractAddress = ref(excludedAddresses[2]);
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(true);
    });

    it("returns isExcluded as false for non-excluded address", () => {
      const contractAddress = ref("0x9999999999999999999999999999999999999999");
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(false);
    });
  });

  describe("reactivity", () => {
    const excludedAddress = "0x0000000000000000000000000000000000008001";
    const nonExcludedAddress = "0x1234567890123456789012345678901234567890";

    beforeEach(() => {
      mockContext = createMockContext([excludedAddress]);
    });

    it("updates isExcluded when contract address changes", () => {
      const contractAddress = ref(nonExcludedAddress);
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(false);

      // Change to excluded address
      contractAddress.value = excludedAddress;
      expect(isExcluded.value).toBe(true);

      // Change back to non-excluded address
      contractAddress.value = nonExcludedAddress;
      expect(isExcluded.value).toBe(false);
    });
  });

  describe("with empty contract address", () => {
    beforeEach(() => {
      mockContext = createMockContext(["0x0000000000000000000000000000000000008001"]);
    });

    it("returns isExcluded as false for empty string", () => {
      const contractAddress = ref("");
      const { isExcluded } = useIsBattlechainExcluded(contractAddress);

      expect(isExcluded.value).toBe(false);
    });
  });
});
