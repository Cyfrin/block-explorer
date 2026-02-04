import { computed, ref, watch } from "vue";

import useContext from "./useContext";

import { FetchInstance } from "@/composables/useFetchInstance";

import type { Address, ContactDetail, ContractState, CoveredAccount, IdentityRequirement } from "@/types";
import type { ComputedRef, Ref } from "vue";

// Agreement list item from API
export interface AgreementListItem {
  agreementAddress: Address;
  owner: Address;
  state?: ContractState;
  protocolName?: string;
  agreementUri?: string;
  bountyPercentage?: number;
  bountyCapUsd?: string;
  retainable?: boolean;
  identityRequirement?: IdentityRequirement;
  diligenceRequirements?: string;
  aggregateBountyCapUsd?: string;
  contactDetails?: ContactDetail[];
  commitmentDeadline?: number;
  coveredContracts?: Address[];
  coveredAccounts?: CoveredAccount[];
  createdAtBlock: number;
  createdAt: number | null;
}

export type AgreementStateFilter = ContractState | "ALL";

export default (stateFilter: Ref<AgreementStateFilter> | ComputedRef<AgreementStateFilter>, context = useContext()) => {
  const agreements = ref<AgreementListItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetch = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const baseUrl = `${context.currentNetwork.value.apiUrl}/battlechain/agreements`;
      const url = stateFilter.value && stateFilter.value !== "ALL" ? `${baseUrl}?state=${stateFilter.value}` : baseUrl;

      const response = await FetchInstance.api(context)<AgreementListItem[]>(url);
      agreements.value = response;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch agreements";
      agreements.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // Auto-fetch when state filter changes
  watch(
    () => stateFilter.value,
    () => {
      fetch();
    },
    { immediate: true }
  );

  return {
    agreements: computed(() => agreements.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    fetch,
  };
};
