import { computed, ref } from "vue";

import { Contract, keccak256, solidityPacked } from "ethers";

import useContext from "@/composables/useContext";
import { processException, default as useWallet } from "@/composables/useWallet";

import AgreementFactoryABI from "@/abi/AgreementFactory.json";
import BattleChainSafeHarborRegistryABI from "@/abi/BattleChainSafeHarborRegistry.json";

import type { AgreementFormData } from "@/types";

export default function useAgreementCreation(context = useContext()) {
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

  // Step 1 state - Create Agreement
  const isCreatingAgreement = ref(false);
  const createAgreementError = ref<string | null>(null);
  const agreementAddress = ref<string | null>(null);
  const createTxHash = ref<string | null>(null);

  // Step 2 state - Adopt Agreement
  const isAdopting = ref(false);
  const adoptError = ref<string | null>(null);
  const adoptTxHash = ref<string | null>(null);

  const isWalletConnected = computed(() => !!walletAddress.value);

  // Current step based on state
  const currentStep = computed(() => {
    if (adoptTxHash.value) return 3; // Complete
    if (agreementAddress.value) return 2; // Ready for adopt
    return 1; // Create agreement
  });

  const isComplete = computed(() => !!adoptTxHash.value);

  const createAgreement = async (formData: AgreementFormData, contractAddress: string) => {
    const factoryAddress = context.currentNetwork.value.agreementFactoryAddress;

    if (!factoryAddress) {
      createAgreementError.value = "AgreementFactory address not configured for this network";
      return;
    }

    try {
      isCreatingAgreement.value = true;
      createAgreementError.value = null;

      const signer = await getL2Signer();
      const signerAddress = await signer.getAddress();
      const factory = new Contract(factoryAddress, AgreementFactoryABI, signer);

      // Generate salt from contract address and current timestamp
      const salt = keccak256(solidityPacked(["address", "uint256"], [contractAddress, Date.now()]));

      // Prepare the details struct matching the ABI AgreementDetails struct
      const details = {
        protocolName: formData.protocolName,
        contactDetails: formData.contactDetails.map((c) => ({
          name: c.name,
          contact: c.contact,
        })),
        chains: formData.chains.map((chain) => ({
          assetRecoveryAddress: chain.assetRecoveryAddress,
          accounts: chain.accounts.map((acc) => ({
            accountAddress: acc.accountAddress,
            childContractScope: acc.childContractScope,
          })),
          caip2ChainId: chain.caip2ChainId,
        })),
        bountyTerms: {
          bountyPercentage: BigInt(formData.bountyTerms.bountyPercentage),
          bountyCapUsd: BigInt(formData.bountyTerms.bountyCapUsd),
          retainable: formData.bountyTerms.retainable,
          identity: formData.bountyTerms.identity,
          diligenceRequirements: formData.bountyTerms.diligenceRequirements,
          aggregateBountyCapUsd: BigInt(formData.bountyTerms.aggregateBountyCapUsd || "0"),
        },
        agreementURI: formData.agreementURI,
      };

      const tx = await factory.create(details, signerAddress, salt, {
        from: signerAddress,
        type: 0,
      });

      createTxHash.value = tx.hash;

      // Wait for transaction to be mined and get the agreement address from events
      const receipt = await tx.wait();

      // The AgreementCreated event has the agreement address as the first indexed topic
      if (receipt.logs && receipt.logs.length > 0) {
        for (const log of receipt.logs) {
          // Check if this log is from the factory
          if (log.address.toLowerCase() === factoryAddress.toLowerCase()) {
            // AgreementCreated event: agreementAddress (indexed), owner (indexed), salt (indexed)
            if (log.topics.length > 1) {
              agreementAddress.value = "0x" + log.topics[1].slice(-40);
              break;
            }
          }
        }
      }

      // Fallback: if we couldn't parse the address from logs
      if (!agreementAddress.value) {
        createAgreementError.value =
          "Transaction succeeded but could not parse agreement address. Please check the transaction on the explorer.";
      }
    } catch (e) {
      try {
        processException(e, "Failed to create agreement");
      } catch (processedError) {
        createAgreementError.value = (processedError as Error).message;
      }
    } finally {
      isCreatingAgreement.value = false;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const adoptSafeHarbor = async (contractAddress: string) => {
    const registryAddress = context.currentNetwork.value.safeHarborRegistryAddress;

    if (!registryAddress) {
      adoptError.value = "SafeHarborRegistry address not configured for this network";
      return;
    }

    if (!agreementAddress.value) {
      adoptError.value = "No agreement address available. Please create an agreement first.";
      return;
    }

    try {
      isAdopting.value = true;
      adoptError.value = null;

      const signer = await getL2Signer();
      const registry = new Contract(registryAddress, BattleChainSafeHarborRegistryABI, signer);

      const tx = await registry.adoptSafeHarbor(agreementAddress.value, {
        from: await signer.getAddress(),
        type: 0,
      });

      adoptTxHash.value = tx.hash;
    } catch (e) {
      try {
        processException(e, "Failed to adopt agreement");
      } catch (processedError) {
        adoptError.value = (processedError as Error).message;
      }
    } finally {
      isAdopting.value = false;
    }
  };

  const reset = () => {
    createAgreementError.value = null;
    agreementAddress.value = null;
    createTxHash.value = null;
    adoptError.value = null;
    adoptTxHash.value = null;
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

    // Step tracking
    currentStep,
    isComplete,

    // Step 1 - Create Agreement
    isCreatingAgreement,
    createAgreementError,
    agreementAddress,
    createTxHash,
    createAgreement,

    // Step 2 - Adopt Agreement
    isAdopting,
    adoptError,
    adoptTxHash,
    adoptSafeHarbor,

    // Reset
    reset,
  };
}
