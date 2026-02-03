import { computed, ref } from "vue";

import { Contract } from "ethers";

import useContext from "@/composables/useContext";
import { processException, default as useWallet } from "@/composables/useWallet";

import AttackRegistryABI from "@/abi/AttackRegistry.json";

export default function useRequestPromotion(context = useContext()) {
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

  const isProcessing = ref(false);
  const error = ref<string | null>(null);
  const txHash = ref<string | null>(null);

  const isWalletConnected = computed(() => !!walletAddress.value);

  const requestPromotion = async (agreementAddress: string) => {
    const registryAddress = context.currentNetwork.value.attackRegistryAddress;

    if (!registryAddress) {
      error.value = "AttackRegistry address not configured for this network";
      return;
    }

    try {
      isProcessing.value = true;
      error.value = null;

      const signer = await getL2Signer();
      const contract = new Contract(registryAddress, AttackRegistryABI, signer);

      const tx = await contract.promote(agreementAddress, {
        from: await signer.getAddress(),
        type: 0,
      });

      txHash.value = tx.hash;
    } catch (e) {
      try {
        processException(e, "Failed to request promotion");
      } catch (processedError) {
        error.value = (processedError as Error).message;
      }
    } finally {
      isProcessing.value = false;
    }
  };

  const reset = () => {
    error.value = null;
    txHash.value = null;
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

    // Request promotion state
    isProcessing,
    error,
    txHash,

    // Request promotion actions
    requestPromotion,
    reset,
  };
}
