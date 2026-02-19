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
  registeredTxHash: string | null; // Transaction hash of the registration
  underAttackAt: number | null;
  underAttackTxHash: string | null; // Transaction hash when contract went under attack
  productionAt: number | null;
  productionTxHash: string | null; // Transaction hash when contract reached production
  attackRequestedAt: number | null; // Unix timestamp in milliseconds when attack mode was requested
  attackRequestedTxHash: string | null; // Transaction hash of the attack request
  promotionRequestedAt: number | null; // Unix timestamp in milliseconds when promotion was requested
  promotionRequestedTxHash: string | null; // Transaction hash of the promotion request
  corruptedAt: number | null; // Unix timestamp in milliseconds when contract was marked corrupted
  corruptedTxHash: string | null; // Transaction hash when contract was marked corrupted
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
  const registeredTxHash = computed(() => stateInfo.value?.registeredTxHash ?? null);
  const underAttackAt = computed(() => stateInfo.value?.underAttackAt ?? null);
  const underAttackTxHash = computed(() => stateInfo.value?.underAttackTxHash ?? null);
  const productionAt = computed(() => stateInfo.value?.productionAt ?? null);
  const productionTxHash = computed(() => stateInfo.value?.productionTxHash ?? null);
  const attackRequestedAt = computed(() => stateInfo.value?.attackRequestedAt ?? null);
  const attackRequestedTxHash = computed(() => stateInfo.value?.attackRequestedTxHash ?? null);
  const promotionRequestedAt = computed(() => stateInfo.value?.promotionRequestedAt ?? null);
  const promotionRequestedTxHash = computed(() => stateInfo.value?.promotionRequestedTxHash ?? null);
  const corruptedAt = computed(() => stateInfo.value?.corruptedAt ?? null);
  const corruptedTxHash = computed(() => stateInfo.value?.corruptedTxHash ?? null);
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

  // Poll until the state changes from the current value (e.g. after a transaction).
  // Retries every `intervalMs` for up to `maxMs`, then does a final fetch regardless.
  const pollUntilStateChanges = async (intervalMs = 3000, maxMs = 30000) => {
    const previousState = stateInfo.value?.state ?? null;
    let elapsed = 0;
    while (elapsed < maxMs) {
      await new Promise((r) => setTimeout(r, intervalMs));
      elapsed += intervalMs;
      await fetch();
      if (stateInfo.value?.state !== previousState) return;
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
    registeredTxHash,
    underAttackAt,
    underAttackTxHash,
    productionAt,
    productionTxHash,
    attackRequestedAt,
    attackRequestedTxHash,
    promotionRequestedAt,
    promotionRequestedTxHash,
    corruptedAt,
    corruptedTxHash,
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
    pollUntilStateChanges,
  };
};
