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

// Response type from the API
interface AgreementByContractResponse {
  agreement: {
    agreementAddress: string;
    owner: string;
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
  } | null;
  hasCoverage: boolean;
  isAgreementContract: boolean;
}

export default (contractAddress: Ref<string> | ComputedRef<string>, context = useContext()) => {
  const agreement = ref<SafeHarborAgreement | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);
  const isAgreementContract = ref(false);

  const hasAgreement = computed(() => agreement.value !== null);

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

      if (response.agreement) {
        // Map API response to SafeHarborAgreement type
        agreement.value = {
          agreementAddress: response.agreement.agreementAddress as Address,
          owner: response.agreement.owner as Address,
          protocolName: response.agreement.protocolName,
          agreementURI: response.agreement.agreementUri,
          bountyPercentage: response.agreement.bountyPercentage,
          bountyCapUsd: response.agreement.bountyCapUsd,
          retainable: response.agreement.retainable,
          identityRequirement: response.agreement.identityRequirement,
          diligenceRequirements: response.agreement.diligenceRequirements,
          aggregateBountyCapUsd: response.agreement.aggregateBountyCapUsd,
          contactDetails: response.agreement.contactDetails,
          commitmentDeadline: response.agreement.commitmentDeadline,
          coveredContracts: (response.agreement.coveredContracts || []) as Address[],
          coveredAccounts: response.agreement.coveredAccounts?.map((acc) => ({
            accountAddress: acc.accountAddress as Address,
            childContractScope: acc.childContractScope,
          })) as CoveredAccount[] | undefined,
          createdAtBlock: response.agreement.createdAtBlock,
          registeredAt: response.agreement.createdAt,
        };
      } else {
        agreement.value = null;
      }
      isFetched.value = true;
    } catch (e) {
      // Any error means we couldn't fetch - don't set isFetched
      // The endpoint returns { agreement: null, hasCoverage: false } when no agreement exists,
      // so a 404 means the BattleChain API routes aren't available
      error.value = e instanceof Error ? e.message : "Failed to fetch agreement";
      agreement.value = null;
      isAgreementContract.value = false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    agreement,
    isLoading,
    error,
    isFetched,
    hasAgreement,
    isAgreementContract: computed(() => isAgreementContract.value),
    canModifyTerms,
    fetch,
  };
};
