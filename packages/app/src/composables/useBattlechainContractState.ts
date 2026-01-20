import { computed, ref } from "vue";

import { FetchError } from "ohmyfetch";

import useContext from "./useContext";

import { FetchInstance } from "@/composables/useFetchInstance";

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

// Default state for contracts with no indexed state (fallback for new contracts)
const defaultContractState: BattlechainContractStateInfo = {
  state: "NEW_DEPLOYMENT" as ContractState,
  wasUnderAttack: false,
  deployedAt: null,
  underAttackAt: null,
  productionAt: null,
};

export default (contractAddress: Ref<string> | ComputedRef<string>, context = useContext()) => {
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
      const response = await FetchInstance.api(context)<BattlechainContractStateInfo>(
        `/battlechain/contract-state/${contractAddress.value}`
      );
      stateInfo.value = response;
    } catch (e) {
      if (e instanceof FetchError && e.response?.status === 404) {
        // Contract state not found - use default state
        stateInfo.value = { ...defaultContractState };
      } else {
        error.value = e instanceof Error ? e.message : "Failed to fetch contract state";
        stateInfo.value = null;
      }
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
