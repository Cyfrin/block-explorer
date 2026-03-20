import { computed, ref, type Ref } from "vue";

import { Contract } from "ethers";

import useContext from "@/composables/useContext";
import { processException, default as useWallet } from "@/composables/useWallet";

import AgreementABI from "@/abi/Agreement.json";

import type { ContactDetail, IdentityRequirement } from "@/types";

export type EditSection =
  | "protocolName"
  | "bountyTerms"
  | "contacts"
  | "coveredContracts"
  | "agreementURI"
  | "commitmentWindow";

export interface BountyTermsInput {
  bountyPercentage: number;
  bountyCapUsd: string;
  retainable: boolean;
  identityRequirement: IdentityRequirement;
  diligenceRequirements: string;
  aggregateBountyCapUsd: string;
}

// Map IdentityRequirement string to contract enum value
const identityToEnum: Record<IdentityRequirement, number> = {
  Anonymous: 0,
  Pseudonymous: 1,
  Named: 2,
};

export default function useAgreementEditing(agreementAddress: Ref<string>, context = useContext()) {
  const walletContext = {
    isReady: context.isReady,
    currentNetwork: computed(() => {
      return {
        ...context.currentNetwork.value,
        explorerUrl: context.currentNetwork.value.rpcUrl,
        chainName: context.currentNetwork.value.l2NetworkName,
        l1ChainId: null as unknown as number,
      };
    }),
    networks: context.networks,
    getL2Provider: () => context.getL2Provider(),
  };

  const {
    connect,
    disconnect,
    getL2Signer,
    address: walletAddress,
    isMetamaskInstalled,
    isConnectPending,
    isReady: isWalletReady,
  } = useWallet(walletContext);

  const activeSection = ref<EditSection | null>(null);
  const isSaving = ref(false);
  const saveError = ref<string | null>(null);
  const lastTxHash = ref<string | null>(null);

  const caip2ChainId = computed(() => `eip155:${context.currentNetwork.value.l2ChainId}`);

  const isWalletConnected = computed(() => !!walletAddress.value);

  const startEditing = (section: EditSection) => {
    activeSection.value = section;
    saveError.value = null;
  };

  const cancelEditing = () => {
    activeSection.value = null;
    saveError.value = null;
  };

  const getContract = async () => {
    const signer = await getL2Signer();
    return new Contract(agreementAddress.value, AgreementABI, signer);
  };

  const setProtocolName = async (newName: string): Promise<boolean> => {
    try {
      isSaving.value = true;
      saveError.value = null;

      const contract = await getContract();
      const signer = await getL2Signer();

      const tx = await contract.setProtocolName(newName, {
        from: await signer.getAddress(),
        type: 0,
      });

      lastTxHash.value = tx.hash;
      await tx.wait();

      activeSection.value = null;
      return true;
    } catch (e) {
      try {
        processException(e, "Failed to update protocol name");
      } catch (processedError) {
        saveError.value = (processedError as Error).message;
      }
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  const setBountyTerms = async (terms: BountyTermsInput): Promise<boolean> => {
    try {
      isSaving.value = true;
      saveError.value = null;

      const contract = await getContract();
      const signer = await getL2Signer();

      // Convert values to contract format
      const bountyTermsStruct = {
        bountyPercentage: BigInt(terms.bountyPercentage),
        bountyCapUsd: BigInt(terms.bountyCapUsd),
        retainable: terms.retainable,
        identity: identityToEnum[terms.identityRequirement],
        diligenceRequirements: terms.diligenceRequirements,
        aggregateBountyCapUsd: BigInt(terms.aggregateBountyCapUsd || "0"),
      };

      const tx = await contract.setBountyTerms(bountyTermsStruct, {
        from: await signer.getAddress(),
        type: 0,
      });

      lastTxHash.value = tx.hash;
      await tx.wait();

      activeSection.value = null;
      return true;
    } catch (e) {
      try {
        processException(e, "Failed to update bounty terms");
      } catch (processedError) {
        saveError.value = (processedError as Error).message;
      }
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  const setContactDetails = async (contacts: ContactDetail[]): Promise<boolean> => {
    try {
      isSaving.value = true;
      saveError.value = null;

      const contract = await getContract();
      const signer = await getL2Signer();

      const tx = await contract.setContactDetails(contacts, {
        from: await signer.getAddress(),
        type: 0,
      });

      lastTxHash.value = tx.hash;
      await tx.wait();

      activeSection.value = null;
      return true;
    } catch (e) {
      try {
        processException(e, "Failed to update contact details");
      } catch (processedError) {
        saveError.value = (processedError as Error).message;
      }
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  const setAgreementURI = async (uri: string): Promise<boolean> => {
    try {
      isSaving.value = true;
      saveError.value = null;

      const contract = await getContract();
      const signer = await getL2Signer();

      const tx = await contract.setAgreementURI(uri, {
        from: await signer.getAddress(),
        type: 0,
      });

      lastTxHash.value = tx.hash;
      await tx.wait();

      activeSection.value = null;
      return true;
    } catch (e) {
      try {
        processException(e, "Failed to update agreement URI");
      } catch (processedError) {
        saveError.value = (processedError as Error).message;
      }
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  const extendCommitmentWindow = async (newDeadline: number): Promise<boolean> => {
    try {
      isSaving.value = true;
      saveError.value = null;

      const contract = await getContract();
      const signer = await getL2Signer();

      // Convert to seconds if needed (contract expects unix timestamp in seconds)
      const deadlineSeconds = Math.floor(newDeadline / 1000);

      const tx = await contract.extendCommitmentWindow(BigInt(deadlineSeconds), {
        from: await signer.getAddress(),
        type: 0,
      });

      lastTxHash.value = tx.hash;
      await tx.wait();

      activeSection.value = null;
      return true;
    } catch (e) {
      try {
        processException(e, "Failed to extend commitment window");
      } catch (processedError) {
        saveError.value = (processedError as Error).message;
      }
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  const addAccounts = async (accounts: { accountAddress: string; childContractScope: number }[]): Promise<boolean> => {
    try {
      isSaving.value = true;
      saveError.value = null;

      const contract = await getContract();
      const signer = await getL2Signer();

      const tx = await contract.addAccounts(caip2ChainId.value, accounts, {
        from: await signer.getAddress(),
        type: 0,
      });

      lastTxHash.value = tx.hash;
      await tx.wait();

      activeSection.value = null;
      return true;
    } catch (e) {
      try {
        processException(e, "Failed to add accounts");
      } catch (processedError) {
        saveError.value = (processedError as Error).message;
      }
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  const removeAccounts = async (accounts: string[]): Promise<boolean> => {
    try {
      isSaving.value = true;
      saveError.value = null;

      const contract = await getContract();
      const signer = await getL2Signer();

      const tx = await contract.removeAccounts(caip2ChainId.value, accounts, {
        from: await signer.getAddress(),
        type: 0,
      });

      lastTxHash.value = tx.hash;
      await tx.wait();

      activeSection.value = null;
      return true;
    } catch (e) {
      try {
        processException(e, "Failed to remove accounts");
      } catch (processedError) {
        saveError.value = (processedError as Error).message;
      }
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  return {
    // Wallet state
    walletAddress,
    isWalletConnected,
    isMetamaskInstalled,
    isConnectPending,
    isWalletReady,

    // Wallet actions
    connect,
    disconnect,

    // Edit state
    activeSection,
    isSaving,
    saveError,
    lastTxHash,

    // Edit actions
    startEditing,
    cancelEditing,

    // Setter methods
    setProtocolName,
    setBountyTerms,
    setContactDetails,
    setAgreementURI,
    extendCommitmentWindow,
    addAccounts,
    removeAccounts,
  };
}
