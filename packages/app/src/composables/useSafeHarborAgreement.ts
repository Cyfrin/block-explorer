import { computed, ref } from "vue";

import useContext from "./useContext";

import { FetchInstance } from "@/composables/useFetchInstance";

import type { Address, SafeHarborAgreement } from "@/types";
import type { ComputedRef, Ref } from "vue";

// Response type from the API
interface AgreementByContractResponse {
  agreement: {
    agreementAddress: string;
    owner: string;
    coveredContracts?: string[];
    createdAtBlock: number;
    createdAt: number | null;
  } | null;
  hasCoverage: boolean;
}

// Default agreement terms (applies when no specific agreement exists)
const defaultAgreementTerms = {
  bountyPercentage: 10,
  bountyCap: BigInt("5000000000000"), // $5M in USDC
  bountyCapToken: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" as Address,
};

export default (contractAddress: Ref<string> | ComputedRef<string>, context = useContext()) => {
  const agreement = ref<SafeHarborAgreement | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isFetched = ref(false);

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

    try {
      const response = await FetchInstance.api(context)<AgreementByContractResponse>(
        `/battlechain/agreement/by-contract/${contractAddress.value}`
      );

      if (response.agreement) {
        // Map API response to SafeHarborAgreement type
        // Note: Additional agreement details (bounty, contact info, etc.) may need
        // to be fetched from the agreement contract or IPFS in the future
        agreement.value = {
          agreementAddress: response.agreement.agreementAddress as Address,
          coveredContracts: (response.agreement.coveredContracts || []) as Address[],
          registeredAt: response.agreement.createdAt,
          // Default bounty terms - may be overridden by on-chain data in the future
          bountyPercentage: defaultAgreementTerms.bountyPercentage,
          bountyCap: defaultAgreementTerms.bountyCap,
          bountyCapToken: defaultAgreementTerms.bountyCapToken,
        };
      } else {
        agreement.value = null;
      }
      isFetched.value = true;
    } catch (e) {
      // Any error means we couldn't fetch - don't set isFetched
      // The endpoint returns { agreement: null, hasCoverage: false } when no agreement exists,
      // so a 404 means the battlechain API routes aren't available
      error.value = e instanceof Error ? e.message : "Failed to fetch agreement";
      agreement.value = null;
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
    canModifyTerms,
    defaultAgreementTerms,
    fetch,
  };
};
