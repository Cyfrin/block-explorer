import { computed, ref } from "vue";

import useContext from "./useContext";

import { FetchInstance } from "@/composables/useFetchInstance";

import type { Address, ContactDetail, ContractState, CoveredAccount, IdentityRequirement } from "@/types";
import type { ComputedRef } from "vue";

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
export type SortKey = "protocolName" | "state" | "bountyPercentage" | "bountyCapUsd" | "createdAt";
export type SortDirection = "asc" | "desc" | null;

export interface AgreementSearchParams {
  state?: AgreementStateFilter;
  sortBy?: SortKey | null;
  sortOrder?: SortDirection;
}

interface PaginatedResponse {
  items: AgreementListItem[];
  meta: {
    currentPage: number;
    itemCount: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
}

export default (searchParams: ComputedRef<AgreementSearchParams>, context = useContext()) => {
  const data = ref<AgreementListItem[]>([]);
  const total = ref<number | null>(null);
  const page = ref<number | null>(null);
  const pageSize = ref(10);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const load = async (nextPage: number, updatedPageSize?: number) => {
    page.value = nextPage;
    if (updatedPageSize) {
      pageSize.value = updatedPageSize;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const url = new URL(`${context.currentNetwork.value.apiUrl}/battlechain/agreements`);
      url.searchParams.set("page", nextPage.toString());
      url.searchParams.set("limit", pageSize.value.toString());

      if (searchParams.value.state && searchParams.value.state !== "ALL") {
        url.searchParams.set("state", searchParams.value.state);
      }
      if (searchParams.value.sortBy) {
        url.searchParams.set("sortBy", searchParams.value.sortBy);
      }
      if (searchParams.value.sortOrder) {
        // API expects uppercase ASC/DESC
        url.searchParams.set("sortOrder", searchParams.value.sortOrder.toUpperCase());
      }

      const response = await FetchInstance.api(context)<PaginatedResponse>(url.toString());
      data.value = response.items;
      total.value = response.meta.totalItems;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch agreements";
      data.value = [];
      total.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    data: computed(() => data.value),
    total: computed(() => total.value),
    page: computed(() => page.value),
    pageSize: computed(() => pageSize.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    load,
  };
};
