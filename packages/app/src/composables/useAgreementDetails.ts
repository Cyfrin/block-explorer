import { ref, type Ref, watch } from "vue";

import useContext from "./useContext";

import { FetchInstance } from "@/composables/useFetchInstance";

import type { Address, ChildContractScope } from "@/types";

export interface CoveredAccount {
  accountAddress: Address;
  childContractScope: ChildContractScope;
}

export interface AgreementDetails {
  agreementAddress: Address;
  coveredAccounts?: CoveredAccount[];
}

export default function useAgreementDetails(agreementAddress: Ref<string>, context = useContext()) {
  const agreement = ref<AgreementDetails | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchAgreement = async () => {
    if (!agreementAddress.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      const response = await FetchInstance.api(context)<AgreementDetails>(
        `/battlechain/agreement/${agreementAddress.value}`
      );
      agreement.value = response;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch agreement";
    } finally {
      isLoading.value = false;
    }
  };

  // Fetch on mount and when address changes
  watch(agreementAddress, fetchAgreement, { immediate: true });

  return { agreement, isLoading, error, refetch: fetchAgreement };
}
