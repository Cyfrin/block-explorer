import { computed, ref } from "vue";

import type { Address, ContractState } from "@/types";
import type { ComputedRef, Ref } from "vue";

// Contract state info returned from the Battlechain API
export interface BattlechainContractStateInfo {
  state: ContractState;
  wasUnderAttack: boolean;
  deployedAt: number | null; // Unix timestamp in milliseconds
  underAttackAt: number | null;
  productionAt: number | null;
  attackDetails?: {
    attackerAddress: Address;
    attackRegisteredAt: number;
    attackType?: string;
  };
}

// Mock data for development - will be replaced with Battlechain API calls
const mockContractStates: Record<string, BattlechainContractStateInfo> = {
  // Example: Contract currently under attack
  "0x0000000000000000000000000000000000008001": {
    state: "UNDER_ATTACK" as ContractState,
    wasUnderAttack: false,
    deployedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    underAttackAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    productionAt: null,
    attackDetails: {
      attackerAddress: "0x1234567890123456789012345678901234567890" as Address,
      attackRegisteredAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      attackType: "Reentrancy",
    },
  },
  // Example: Contract in production (was previously attacked)
  "0x0000000000000000000000000000000000008002": {
    state: "PRODUCTION" as ContractState,
    wasUnderAttack: true,
    deployedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    underAttackAt: Date.now() - 20 * 24 * 60 * 60 * 1000, // 20 days ago
    productionAt: Date.now() - 13 * 24 * 60 * 60 * 1000, // 13 days ago (7 days after attack)
  },
  // Example: New deployment, not attacked
  "0x0000000000000000000000000000000000008003": {
    state: "NEW_DEPLOYMENT" as ContractState,
    wasUnderAttack: false,
    deployedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    underAttackAt: null,
    productionAt: null,
  },
  // Example: Contract in production (never attacked - auto promoted)
  "0x0000000000000000000000000000000000008004": {
    state: "PRODUCTION" as ContractState,
    wasUnderAttack: false,
    deployedAt: Date.now() - 14 * 24 * 60 * 60 * 1000, // 14 days ago
    underAttackAt: null,
    productionAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago (auto-promoted)
  },
};

// Default state for contracts not in the mock data
const defaultContractState: BattlechainContractStateInfo = {
  state: "NEW_DEPLOYMENT" as ContractState,
  wasUnderAttack: false,
  deployedAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
  underAttackAt: null,
  productionAt: null,
};

export default (contractAddress: Ref<string> | ComputedRef<string>) => {
  const stateInfo = ref<BattlechainContractStateInfo | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const hasStateInfo = computed(() => stateInfo.value !== null);

  const state = computed(() => stateInfo.value?.state ?? null);
  const wasUnderAttack = computed(() => stateInfo.value?.wasUnderAttack ?? false);
  const deployedAt = computed(() => stateInfo.value?.deployedAt ?? null);
  const underAttackAt = computed(() => stateInfo.value?.underAttackAt ?? null);
  const productionAt = computed(() => stateInfo.value?.productionAt ?? null);
  const attackDetails = computed(() => stateInfo.value?.attackDetails ?? null);

  const fetch = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      const address = contractAddress.value.toLowerCase();

      // Look up state by contract address
      const normalizedAddress = Object.keys(mockContractStates).find((key) => key.toLowerCase() === address);

      if (normalizedAddress) {
        stateInfo.value = mockContractStates[normalizedAddress];
      } else {
        // Return default state for any contract not in mock data
        stateInfo.value = {
          ...defaultContractState,
          deployedAt: Date.now() - Math.floor(Math.random() * 5 + 1) * 24 * 60 * 60 * 1000, // Random 1-5 days ago
        };
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch contract state";
      stateInfo.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    stateInfo,
    isLoading,
    error,
    hasStateInfo,
    state,
    wasUnderAttack,
    deployedAt,
    underAttackAt,
    productionAt,
    attackDetails,
    fetch,
  };
};
