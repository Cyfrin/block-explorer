import { computed, ref, watch } from "vue";

import useContext from "@/composables/useContext";
import { FetchInstance } from "@/composables/useFetchInstance";

import type { ComputedRef, Ref } from "vue";

interface AttackModeratorResponse {
  attackModerator: string;
  wasTransferred: boolean;
}

/**
 * Composable to fetch the attack moderator for an agreement.
 * The attack moderator is the address that can call promote() and cancelPromotion().
 *
 * The initial attack moderator equals the Agreement owner at registration time.
 * It can be transferred via transferAttackModerator() on the AttackRegistry.
 */
export default function useAttackModerator(
  agreementAddress: Ref<string> | ComputedRef<string>,
  walletAddress: Ref<string | null> | ComputedRef<string | null>,
  context = useContext()
) {
  const attackModerator = ref<string | null>(null);
  const wasTransferred = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Check if the connected wallet is the attack moderator
  const isAttackModerator = computed(() => {
    if (!attackModerator.value || !walletAddress.value) return false;
    return attackModerator.value.toLowerCase() === walletAddress.value.toLowerCase();
  });

  const fetch = async () => {
    const address = agreementAddress.value;
    if (!address) {
      attackModerator.value = null;
      wasTransferred.value = false;
      return;
    }

    try {
      isLoading.value = true;
      error.value = null;

      const response = await FetchInstance.api(context)<AttackModeratorResponse>(
        `/battlechain/attack-moderator/${address}`
      );

      attackModerator.value = response.attackModerator;
      wasTransferred.value = response.wasTransferred;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch attack moderator";
      attackModerator.value = null;
      wasTransferred.value = false;
    } finally {
      isLoading.value = false;
    }
  };

  // Auto-fetch when agreement address changes
  watch(
    () => agreementAddress.value,
    (newAddress) => {
      if (newAddress) {
        fetch();
      } else {
        attackModerator.value = null;
        wasTransferred.value = false;
      }
    },
    { immediate: true }
  );

  return {
    attackModerator,
    wasTransferred,
    isAttackModerator,
    isLoading,
    error,
    fetch,
  };
}
