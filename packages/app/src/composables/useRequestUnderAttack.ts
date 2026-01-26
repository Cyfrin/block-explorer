import { computed, ref } from "vue";

import { Contract } from "ethers";

import useContext from "@/composables/useContext";
import { processException, default as useWallet } from "@/composables/useWallet";

import AttackRegistryABI from "@/abi/AttackRegistry.json";

export default function useRequestUnderAttack(context = useContext()) {
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

  const isRequesting = ref(false);
  const requestError = ref<string | null>(null);
  const requestTxHash = ref<string | null>(null);

  const isWalletConnected = computed(() => !!walletAddress.value);

  const requestUnderAttack = async (contractAddress: string, agreementAddress: string) => {
    const registryAddress = context.currentNetwork.value.attackRegistryAddress;

    if (!registryAddress) {
      requestError.value = "AttackRegistry address not configured for this network";
      return;
    }

    try {
      isRequesting.value = true;
      requestError.value = null;

      const signer = await getL2Signer();
      const contract = new Contract(registryAddress, AttackRegistryABI, signer);

      const tx = await contract.requestUnderAttack(contractAddress, agreementAddress, {
        from: await signer.getAddress(),
        type: 0,
      });

      requestTxHash.value = tx.hash;
    } catch (e) {
      try {
        processException(e, "Request failed");
      } catch (processedError) {
        requestError.value = (processedError as Error).message;
      }
    } finally {
      isRequesting.value = false;
    }
  };

  const reset = () => {
    requestError.value = null;
    requestTxHash.value = null;
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

    // Request state
    isRequesting,
    requestError,
    requestTxHash,

    // Request actions
    requestUnderAttack,
    reset,
  };
}
