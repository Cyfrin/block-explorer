import { computed, ref } from "vue";

import useContext from "./useContext";

import { FetchInstance } from "@/composables/useFetchInstance";

import type { Address, ContractState } from "@/types";
import type { ComputedRef, Ref } from "vue";

// Contract state info returned from the BattleChain API
export interface BattlechainContractStateInfo {
  state: ContractState;
  wasUnderAttack: boolean;
  registeredAt: number | null; // Unix timestamp in milliseconds when registered in AttackRegistry
  underAttackAt: number | null;
  productionAt: number | null;
  attackRequestedAt: number | null; // Unix timestamp in milliseconds when attack mode was requested
  promotionRequestedAt: number | null; // Unix timestamp in milliseconds when promotion was requested
  corruptedAt: number | null; // Unix timestamp in milliseconds when contract was marked corrupted
  promotionWindowEnds: number | null; // Unix timestamp in milliseconds when auto-promotion will occur
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
  const attackRequestedAt = computed(() => stateInfo.value?.attackRequestedAt ?? null);
  const promotionRequestedAt = computed(() => stateInfo.value?.promotionRequestedAt ?? null);
  const corruptedAt = computed(() => stateInfo.value?.corruptedAt ?? null);
  const promotionWindowEnds = computed(() => stateInfo.value?.promotionWindowEnds ?? null);
  const commitmentLockedUntil = computed(() => stateInfo.value?.commitmentLockedUntil ?? null);
  const attackDetails = computed(() => stateInfo.value?.attackDetails ?? null);

  // Convenience flags for checking specific states
  const isCorrupted = computed(() => stateInfo.value?.state === "CORRUPTED");
  const isPromotionRequested = computed(() => stateInfo.value?.state === "PROMOTION_REQUESTED");
  const isUnderAttack = computed(() => stateInfo.value?.state === "UNDER_ATTACK");
  const isAttackRequested = computed(() => stateInfo.value?.state === "ATTACK_REQUESTED");
  const isProduction = computed(() => stateInfo.value?.state === "PRODUCTION");
  const isNewDeployment = computed(() => stateInfo.value?.state === "NEW_DEPLOYMENT");

  // True if contract has called requestUnderAttack (i.e., past NEW_DEPLOYMENT state)
  const hasRequestedAttack = computed(() => {
    const state = stateInfo.value?.state;
    return (
      state === "ATTACK_REQUESTED" ||
      state === "UNDER_ATTACK" ||
      state === "PROMOTION_REQUESTED" ||
      state === "PRODUCTION" ||
      state === "CORRUPTED"
    );
  });

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
    attackRequestedAt,
    promotionRequestedAt,
    corruptedAt,
    promotionWindowEnds,
    commitmentLockedUntil,
    attackDetails,
    isCorrupted,
    isPromotionRequested,
    isUnderAttack,
    isAttackRequested,
    isProduction,
    isNewDeployment,
    hasRequestedAttack,
    fetch,
  };
};
