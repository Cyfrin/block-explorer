import { computed, ref } from "vue";

import useContext from "./useContext";

import { FetchInstance } from "@/composables/useFetchInstance";

import type { Address, ContractState } from "@/types";
import type { ComputedRef, Ref } from "vue";

// Contract state info returned from the Battlechain API
export interface BattlechainContractStateInfo {
  state: ContractState;
  wasUnderAttack: boolean;
  registeredAt: number | null; // Unix timestamp in milliseconds when registered in AttackRegistry
  underAttackAt: number | null;
  productionAt: number | null;
  commitmentLockedUntil: number | null; // Unix timestamp in milliseconds until which Safe Harbor terms are locked
  attackDetails?: {
    attackerAddress: Address;
    attackRegisteredAt: number;
    attackType?: string;
  };
}

export default (contractAddress: Ref<string> | ComputedRef<string>, context = useContext()) => {
  const stateInfo = ref<BattlechainContractStateInfo | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const hasStateInfo = computed(() => stateInfo.value !== null);

  const state = computed(() => stateInfo.value?.state ?? null);
  const isNotRegistered = computed(() => stateInfo.value?.state === "NOT_REGISTERED");
  const wasUnderAttack = computed(() => stateInfo.value?.wasUnderAttack ?? false);
  const registeredAt = computed(() => stateInfo.value?.registeredAt ?? null);
  const underAttackAt = computed(() => stateInfo.value?.underAttackAt ?? null);
  const productionAt = computed(() => stateInfo.value?.productionAt ?? null);
  const commitmentLockedUntil = computed(() => stateInfo.value?.commitmentLockedUntil ?? null);
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
    isNotRegistered,
    wasUnderAttack,
    registeredAt,
    underAttackAt,
    productionAt,
    commitmentLockedUntil,
    attackDetails,
    fetch,
  };
};
