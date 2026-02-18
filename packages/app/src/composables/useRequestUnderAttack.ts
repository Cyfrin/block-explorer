import { computed, ref } from "vue";

import { Contract } from "ethers";

import useContext from "@/composables/useContext";
import { processException, default as useWallet } from "@/composables/useWallet";

import AgreementABI from "@/abi/Agreement.json";
import AttackRegistryABI from "@/abi/AttackRegistry.json";

const MIN_COMMITMENT_SECONDS = 7 * 24 * 60 * 60; // 7 days

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

  // Commitment deadline state
  const commitmentDeadline = ref<number | null>(null); // unix timestamp in seconds, null = not yet checked
  const isCheckingCommitment = ref(false);
  const isExtending = ref(false);
  const extendError = ref<string | null>(null);

  const isWalletConnected = computed(() => !!walletAddress.value);

  const isCommitmentSufficient = computed(() => {
    if (commitmentDeadline.value === null) return false;
    const now = Math.floor(Date.now() / 1000);
    return commitmentDeadline.value >= now + MIN_COMMITMENT_SECONDS;
  });

  const checkCommitmentDeadline = async (agreementAddress: string) => {
    try {
      isCheckingCommitment.value = true;
      extendError.value = null;

      const provider = context.getL2Provider();
      const contract = new Contract(agreementAddress, AgreementABI, provider);
      const deadline = await contract.getCantChangeUntil();
      commitmentDeadline.value = Number(deadline);
    } catch (e) {
      commitmentDeadline.value = 0;
    } finally {
      isCheckingCommitment.value = false;
    }
  };

  const extendCommitmentWindow = async (agreementAddress: string, newDeadlineSeconds: number): Promise<boolean> => {
    try {
      isExtending.value = true;
      extendError.value = null;

      const signer = await getL2Signer();
      const contract = new Contract(agreementAddress, AgreementABI, signer);

      const tx = await contract.extendCommitmentWindow(BigInt(newDeadlineSeconds), {
        from: await signer.getAddress(),
        type: 0,
      });

      await tx.wait();
      commitmentDeadline.value = newDeadlineSeconds;
      return true;
    } catch (e) {
      try {
        processException(e, "Failed to extend commitment window");
      } catch (processedError) {
        extendError.value = (processedError as Error).message;
      }
      return false;
    } finally {
      isExtending.value = false;
    }
  };

  const requestUnderAttack = async (agreementAddress: string, contractAddress: string) => {
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

      // Check if contract was deployed via BattleChainDeployer
      const authorizedOwner = await contract.getAuthorizedOwner(contractAddress);
      const isDeployedViaBattleChain = authorizedOwner !== "0x0000000000000000000000000000000000000000";

      let tx;
      if (isDeployedViaBattleChain) {
        // Contract was deployed via BattleChainDeployer - use requestUnderAttack
        tx = await contract.requestUnderAttack(agreementAddress, {
          from: await signer.getAddress(),
          type: 0,
        });
      } else {
        // Contract was deployed externally - use requestUnderAttackByNonAuthorized
        tx = await contract.requestUnderAttackByNonAuthorized(agreementAddress, {
          from: await signer.getAddress(),
          type: 0,
        });
      }

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
    commitmentDeadline.value = null;
    extendError.value = null;
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

    // Commitment state
    commitmentDeadline,
    isCommitmentSufficient,
    isCheckingCommitment,
    isExtending,
    extendError,

    // Commitment actions
    checkCommitmentDeadline,
    extendCommitmentWindow,

    // Request actions
    requestUnderAttack,
    reset,
  };
}
