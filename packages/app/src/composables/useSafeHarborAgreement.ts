import { computed, ref } from "vue";

import useContext from "./useContext";

import { FetchInstance } from "@/composables/useFetchInstance";

import type {
  Address,
  ChildContractScope,
  ContactDetail,
  CoveredAccount,
  IdentityRequirement,
  SafeHarborAgreement,
} from "@/types";
import type { ComputedRef, Ref } from "vue";

// Single agreement shape from the API
interface AgreementResponse {
  agreementAddress: string;
  owner: string;
  state?: string;
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
  coveredContracts?: string[];
  coveredAccounts?: {
    accountAddress: string;
    childContractScope: ChildContractScope;
  }[];
  createdAtBlock: number;
  createdAt: number | null;
}

// Response type from the API
interface AgreementByContractResponse {
  agreements: AgreementResponse[];
  hasCoverage: boolean;
  isAgreementContract: boolean;
}

export interface AgreementWithState {
  agreement: SafeHarborAgreement;
  state: string | null;
}

function mapAgreementResponse(resp: AgreementResponse): AgreementWithState {
  return {
    agreement: {
      agreementAddress: resp.agreementAddress as Address,
      owner: resp.owner as Address,
      protocolName: resp.protocolName,
      agreementURI: resp.agreementUri,
      bountyPercentage: resp.bountyPercentage,
      bountyCapUsd: resp.bountyCapUsd,
      retainable: resp.retainable,
      identityRequirement: resp.identityRequirement,
      diligenceRequirements: resp.diligenceRequirements,
      aggregateBountyCapUsd: resp.aggregateBountyCapUsd,
      contactDetails: resp.contactDetails,
      commitmentDeadline: resp.commitmentDeadline,
      coveredContracts: (resp.coveredContracts || []) as Address[],
      coveredAccounts: resp.coveredAccounts?.map((acc) => ({
        accountAddress: acc.accountAddress as Address,
        childContractScope: acc.childContractScope,
      })) as CoveredAccount[] | undefined,
      createdAtBlock: resp.createdAtBlock,
      registeredAt: resp.createdAt,
    },
    state: resp.state ?? null,
  };
}

export default (contractAddress: Ref<string> | ComputedRef<string>, context = useContext()) => {
  const agreements = ref<AgreementWithState[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);
  const isAgreementContract = ref(false);

  const hasAgreement = computed(() => agreements.value.length > 0);

  // First agreement (backward compat for components that use single agreement)
  const agreement = computed(() => agreements.value[0]?.agreement ?? null);
  const agreementState = computed(() => agreements.value[0]?.state ?? null);

  const canModifyTerms = computed(() => {
    if (!agreement.value) return true;
    if (!agreement.value.commitmentDeadline) return true;
    return Date.now() > agreement.value.commitmentDeadline;
  });

  const fetch = async () => {
    isLoading.value = true;
    error.value = null;
    isFetched.value = false;
    isAgreementContract.value = false;

    try {
      const response = await FetchInstance.api(context)<AgreementByContractResponse>(
        `/battlechain/agreement/by-contract/${contractAddress.value}`
      );

      isAgreementContract.value = response.isAgreementContract;
      agreements.value = (response.agreements ?? []).map(mapAgreementResponse);
      isFetched.value = true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch agreement";
      agreements.value = [];
      isAgreementContract.value = false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    agreements,
    agreement,
    agreementState,
    isLoading,
    error,
    isFetched,
    hasAgreement,
    isAgreementContract: computed(() => isAgreementContract.value),
    canModifyTerms,
    fetch,
  };
};
