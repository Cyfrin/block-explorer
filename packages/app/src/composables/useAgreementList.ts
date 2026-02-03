import { onUnmounted, ref } from "vue";

import useContext from "./useContext";

import { FetchInstance } from "@/composables/useFetchInstance";

import type { Address, ChildContractScope } from "@/types";

export interface CoveredAccount {
  accountAddress: Address;
  childContractScope: ChildContractScope;
}

export interface DetectedAgreement {
  agreementAddress: Address;
  owner: Address;
  protocolName?: string;
  bountyPercentage?: number;
  bountyCapUsd?: string;
  coveredContracts: Address[];
  coveredAccounts?: CoveredAccount[];
}

interface CoveredAccountDto {
  accountAddress: string;
  childContractScope: number;
}

interface AgreementDto {
  agreementAddress: string;
  owner: string;
  protocolName?: string;
  bountyPercentage?: number;
  bountyCapUsd?: string;
  coveredContracts?: string[];
  coveredAccounts?: CoveredAccountDto[];
}

export default function useAgreementList(context = useContext()) {
  const agreements = ref<DetectedAgreement[]>([]);
  const isPolling = ref(false);
  const error = ref<string | null>(null);

  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let targetContract: string | null = null;

  const fetchAgreements = async () => {
    if (!targetContract) return;

    try {
      error.value = null;
      const response = await FetchInstance.api(context)<AgreementDto[]>("/battlechain/agreements");

      // Filter to agreements that cover the target contract
      const normalizedTarget = targetContract.toLowerCase();
      agreements.value = (response || [])
        .filter((a) => a.coveredContracts?.some((c) => c.toLowerCase() === normalizedTarget))
        .map((a) => ({
          agreementAddress: a.agreementAddress as Address,
          owner: a.owner as Address,
          protocolName: a.protocolName,
          bountyPercentage: a.bountyPercentage,
          bountyCapUsd: a.bountyCapUsd,
          coveredContracts: (a.coveredContracts || []) as Address[],
          coveredAccounts: a.coveredAccounts?.map((acc) => ({
            accountAddress: acc.accountAddress as Address,
            childContractScope: acc.childContractScope as ChildContractScope,
          })),
        }));
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch agreements";
    }
  };

  const startPolling = (contractAddress: string, intervalMs = 5000) => {
    // Stop any existing polling first
    stopPolling();

    targetContract = contractAddress;
    isPolling.value = true;

    // Initial fetch
    fetchAgreements();

    // Set up polling interval
    pollingInterval = setInterval(fetchAgreements, intervalMs);
  };

  const stopPolling = () => {
    isPolling.value = false;
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  const reset = () => {
    stopPolling();
    agreements.value = [];
    error.value = null;
    targetContract = null;
  };

  // Cleanup on unmount
  onUnmounted(() => {
    stopPolling();
  });

  return {
    agreements,
    isPolling,
    error,
    startPolling,
    stopPolling,
    reset,
  };
}
