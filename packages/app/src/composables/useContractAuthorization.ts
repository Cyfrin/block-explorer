import { computed, type Ref, ref, watch } from "vue";

import useContext from "./useContext";

import { FetchInstance } from "@/composables/useFetchInstance";

interface AuthorizationResponse {
  authorizedOwner: string | null;
  isDeployedViaBattleChain: boolean;
}

export default function useContractAuthorization(
  contractAddress: Ref<string>,
  walletAddress: Ref<string | null>,
  context = useContext()
) {
  const authorizedOwner = ref<string | null>(null);
  const isDeployedViaBattleChain = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthorized = computed(() => {
    if (!walletAddress.value || !authorizedOwner.value) return false;
    return walletAddress.value.toLowerCase() === authorizedOwner.value.toLowerCase();
  });

  const fetchAuthorization = async () => {
    if (!contractAddress.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      const response = await FetchInstance.api(context)<AuthorizationResponse>(
        `/battlechain/authorized-owner/${contractAddress.value}`
      );
      authorizedOwner.value = response.authorizedOwner;
      isDeployedViaBattleChain.value = response.isDeployedViaBattleChain;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch authorization";
    } finally {
      isLoading.value = false;
    }
  };

  watch(contractAddress, fetchAuthorization, { immediate: true });

  return {
    authorizedOwner,
    isAuthorized,
    isDeployedViaBattleChain,
    isLoading,
    error,
    refetch: fetchAuthorization,
  };
}

// Batch fetch for multiple contracts
export async function fetchAuthorizedOwners(
  contractAddresses: string[],
  context = useContext()
): Promise<Record<string, AuthorizationResponse>> {
  if (contractAddresses.length === 0) {
    return {};
  }

  const response = await FetchInstance.api(context)<Record<string, AuthorizationResponse>>(
    `/battlechain/authorized-owners`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contractAddresses),
    }
  );

  return response;
}
