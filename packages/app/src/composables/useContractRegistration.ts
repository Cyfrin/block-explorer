import { computed, ref } from "vue";

import { Contract } from "ethers";

import useContext from "@/composables/useContext";
import { processException, default as useWallet } from "@/composables/useWallet";

import AttackRegistryABI from "@/abi/AttackRegistry.json";

export default function useContractRegistration(context = useContext()) {
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

  const isRegistering = ref(false);
  const registrationError = ref<string | null>(null);
  const registrationTxHash = ref<string | null>(null);

  const isWalletConnected = computed(() => !!walletAddress.value);

  const registerContract = async (contractAddress: string) => {
    const registryAddress = context.currentNetwork.value.attackRegistryAddress;

    if (!registryAddress) {
      registrationError.value = "AttackRegistry address not configured for this network";
      return;
    }

    try {
      isRegistering.value = true;
      registrationError.value = null;

      const signer = await getL2Signer();
      const contract = new Contract(registryAddress, AttackRegistryABI, signer);

      const tx = await contract.registerContract(contractAddress, {
        from: await signer.getAddress(),
        type: 0,
      });

      registrationTxHash.value = tx.hash;
    } catch (e) {
      try {
        processException(e, "Registration failed");
      } catch (processedError) {
        registrationError.value = (processedError as Error).message;
      }
    } finally {
      isRegistering.value = false;
    }
  };

  const reset = () => {
    registrationError.value = null;
    registrationTxHash.value = null;
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

    // Registration state
    isRegistering,
    registrationError,
    registrationTxHash,

    // Registration actions
    registerContract,
    reset,
  };
}
