import { computed, ref } from "vue";

import type { Address, SafeHarborAgreement } from "@/types";
import type { ComputedRef, Ref } from "vue";

// Mock data for development - will be replaced with on-chain fetching
// Note: Using lowercase addresses to avoid checksum issues - AddressLink will handle checksumming
const mockAgreements: Record<string, SafeHarborAgreement> = {
  // Example contract with full agreement
  "0x0000000000000000000000000000000000008001": {
    agreementAddress: "0x0000000000000000000000000000000000009001" as Address,
    protocolName: "Example Protocol",
    bountyPercentage: 10,
    bountyCap: BigInt("5000000000000"), // $5M in USDC (6 decimals)
    bountyCapToken: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" as Address, // USDC
    allowAnonymous: true,
    coveredContracts: [
      "0x0000000000000000000000000000000000008001" as Address,
      "0x0000000000000000000000000000000000008002" as Address,
    ],
    contactEmail: "security@example.com",
    contactDiscord: "discord.gg/exampleprotocol",
    contactTelegram: "@example_security",
    assetRecoveryAddress: "0x0000000000000000000000000000000000000099" as Address,
    commitmentDeadline: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    agreementURI: "ipfs://QmYwAPJzv5CZsnAzt8auVZRn7rnBNkfRsYXDqkaK8Yp6kz",
    registeredAt: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
    lastModified: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
  },
};

// Default agreement terms (applies when no specific agreement exists)
const defaultAgreementTerms = {
  bountyPercentage: 10,
  bountyCap: BigInt("5000000000000"), // $5M in USDC
  bountyCapToken: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" as Address,
};

export default (contractAddress: Ref<string> | ComputedRef<string>) => {
  const agreement = ref<SafeHarborAgreement | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const hasAgreement = computed(() => agreement.value !== null);

  const canModifyTerms = computed(() => {
    if (!agreement.value) return true;
    return Date.now() > agreement.value.commitmentDeadline;
  });

  const fetch = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Look up agreement by contract address
      const address = contractAddress.value.toLowerCase();

      // Check if this address is covered by any agreement
      for (const [, agreementData] of Object.entries(mockAgreements)) {
        const coveredAddresses = agreementData.coveredContracts.map((a) => a.toLowerCase());
        if (coveredAddresses.includes(address)) {
          agreement.value = agreementData;
          return;
        }
      }

      // Check direct address match
      const normalizedAddress = Object.keys(mockAgreements).find((key) => key.toLowerCase() === address);
      if (normalizedAddress) {
        agreement.value = mockAgreements[normalizedAddress];
      } else {
        agreement.value = null;
      }
    } catch (e) {
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
    hasAgreement,
    canModifyTerms,
    defaultAgreementTerms,
    fetch,
  };
};
