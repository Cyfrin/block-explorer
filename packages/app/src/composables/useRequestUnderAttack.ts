import { computed, ref, watch } from "vue";

import { Contract } from "ethers";

import useContext from "@/composables/useContext";
import { processException, default as useWallet } from "@/composables/useWallet";

import AgreementABI from "@/abi/Agreement.json";
import AttackRegistryABI from "@/abi/AttackRegistry.json";
import ERC20ABI from "@/abi/ERC20.json";

const MIN_COMMITMENT_SECONDS = 7 * 24 * 60 * 60; // 7 days
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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

  // Bond state
  const bondToken = ref<string | null>(null);
  const bondTokenSymbol = ref("TOKEN");
  const bondTokenDecimals = ref(18);
  const feeAmount = ref(0n);
  const bondAmount = ref(0n);
  const isDeployedViaBattleChain = ref<boolean | null>(null);
  const isFetchingBondInfo = ref(false);
  const bondInfoError = ref<string | null>(null);

  // Approval state
  const currentAllowance = ref(0n);
  const userBalance = ref(0n);
  const isApproving = ref(false);
  const approvalError = ref<string | null>(null);

  const isWalletConnected = computed(() => !!walletAddress.value);

  const isCommitmentSufficient = computed(() => {
    if (commitmentDeadline.value === null) return false;
    const now = Math.floor(Date.now() / 1000);
    return commitmentDeadline.value >= now + MIN_COMMITMENT_SECONDS;
  });

  const totalRequired = computed(() => feeAmount.value + bondAmount.value);

  const isEthBond = computed(() => !bondToken.value || bondToken.value === ZERO_ADDRESS);

  const hasInsufficientBalance = computed(() => {
    if (totalRequired.value === 0n) return false;
    return userBalance.value < totalRequired.value;
  });

  const needsApproval = computed(() => {
    if (totalRequired.value === 0n) return false;
    if (isEthBond.value) return false;
    return currentAllowance.value < totalRequired.value;
  });

  const isBondReady = computed(() => {
    if (totalRequired.value === 0n) return true;
    return !hasInsufficientBalance.value && !needsApproval.value;
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

  const fetchBondRequirements = async (contractAddress: string) => {
    const registryAddress = context.currentNetwork.value.attackRegistryAddress;
    if (!registryAddress) return;

    try {
      isFetchingBondInfo.value = true;
      bondInfoError.value = null;

      const provider = context.getL2Provider();
      const registry = new Contract(registryAddress, AttackRegistryABI, provider);

      // Fetch bond config and deployer check in parallel
      const [token, fee, verifiedBond, unverifiedBond, authorizedOwner] = await Promise.all([
        registry.getBondToken(),
        registry.getFeeAmount(),
        registry.getVerifiedBondAmount(),
        registry.getUnverifiedBondAmount(),
        registry.getAuthorizedOwner(contractAddress),
      ]);

      bondToken.value = token as string;
      feeAmount.value = BigInt(fee);
      const isVerified = (authorizedOwner as string) !== ZERO_ADDRESS;
      isDeployedViaBattleChain.value = isVerified;
      bondAmount.value = isVerified ? BigInt(verifiedBond) : BigInt(unverifiedBond);

      // Fetch token metadata if it's an ERC-20 (not ETH)
      if (bondToken.value && bondToken.value !== ZERO_ADDRESS) {
        try {
          const tokenContract = new Contract(bondToken.value, ERC20ABI, provider);
          const [symbol, decimals] = await Promise.all([tokenContract.symbol(), tokenContract.decimals()]);
          bondTokenSymbol.value = symbol as string;
          bondTokenDecimals.value = Number(decimals);
        } catch {
          // If token metadata fails, use defaults
          bondTokenSymbol.value = "TOKEN";
          bondTokenDecimals.value = 18;
        }
      } else {
        bondTokenSymbol.value = "ETH";
        bondTokenDecimals.value = 18;
      }
    } catch (e) {
      try {
        processException(e, "Failed to fetch bond requirements");
      } catch (processedError) {
        bondInfoError.value = (processedError as Error).message;
      }
    } finally {
      isFetchingBondInfo.value = false;
    }
  };

  const checkAllowanceAndBalance = async () => {
    if (totalRequired.value === 0n || !walletAddress.value) return;

    const registryAddress = context.currentNetwork.value.attackRegistryAddress;
    if (!registryAddress) return;

    try {
      const provider = context.getL2Provider();

      if (isEthBond.value) {
        // For ETH bonds, check ETH balance
        const balance = await provider.getBalance(walletAddress.value);
        userBalance.value = BigInt(balance);
        currentAllowance.value = totalRequired.value; // ETH doesn't need approval
      } else {
        // For ERC-20, check allowance and balance
        const tokenContract = new Contract(bondToken.value!, ERC20ABI, provider);
        const [allowance, balance] = await Promise.all([
          tokenContract.allowance(walletAddress.value, registryAddress),
          tokenContract.balanceOf(walletAddress.value),
        ]);
        currentAllowance.value = BigInt(allowance);
        userBalance.value = BigInt(balance);
      }
    } catch {
      // Silently fail — user will see the approval/balance state as unknown
      currentAllowance.value = 0n;
      userBalance.value = 0n;
    }
  };

  const approveToken = async () => {
    const registryAddress = context.currentNetwork.value.attackRegistryAddress;
    if (!registryAddress || !bondToken.value || isEthBond.value) return;

    try {
      isApproving.value = true;
      approvalError.value = null;

      const signer = await getL2Signer();
      const tokenContract = new Contract(bondToken.value, ERC20ABI, signer);

      const tx = await tokenContract.approve(registryAddress, totalRequired.value, {
        from: await signer.getAddress(),
        type: 0,
      });

      await tx.wait();
      await checkAllowanceAndBalance();
    } catch (e) {
      try {
        processException(e, "Failed to approve token");
      } catch (processedError) {
        approvalError.value = (processedError as Error).message;
      }
    } finally {
      isApproving.value = false;
    }
  };

  // Re-check allowance/balance when wallet connects
  watch(walletAddress, (newAddr) => {
    if (newAddr && totalRequired.value > 0n) {
      checkAllowanceAndBalance();
    }
  });

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
      const signerAddress = await signer.getAddress();

      // Build tx options — include ETH value if bond token is ETH
      const txOptions: { from: string; type: number; value?: bigint } = {
        from: signerAddress,
        type: 0,
      };
      if (isEthBond.value && totalRequired.value > 0n) {
        txOptions.value = totalRequired.value;
      }

      let tx;
      // Use cached deployer check if available, otherwise check now
      const isVerified =
        isDeployedViaBattleChain.value ??
        (await (async () => {
          const provider = context.getL2Provider();
          const readOnly = new Contract(registryAddress, AttackRegistryABI, provider);
          const owner = await readOnly.getAuthorizedOwner(contractAddress);
          return (owner as string) !== ZERO_ADDRESS;
        })());

      if (isVerified) {
        tx = await contract.requestUnderAttack(agreementAddress, txOptions);
      } else {
        tx = await contract.requestUnderAttackForUnverifiedContracts(agreementAddress, txOptions);
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

    // Bond state
    bondToken.value = null;
    bondTokenSymbol.value = "TOKEN";
    bondTokenDecimals.value = 18;
    feeAmount.value = 0n;
    bondAmount.value = 0n;
    isDeployedViaBattleChain.value = null;
    isFetchingBondInfo.value = false;
    bondInfoError.value = null;

    // Approval state
    currentAllowance.value = 0n;
    userBalance.value = 0n;
    approvalError.value = null;
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

    // Bond state
    bondToken,
    bondTokenSymbol,
    bondTokenDecimals,
    feeAmount,
    bondAmount,
    totalRequired,
    isEthBond,
    isFetchingBondInfo,
    bondInfoError,
    isDeployedViaBattleChain,

    // Approval state
    currentAllowance,
    userBalance,
    hasInsufficientBalance,
    needsApproval,
    isBondReady,
    isApproving,
    approvalError,

    // Bond/approval actions
    fetchBondRequirements,
    checkAllowanceAndBalance,
    approveToken,

    // Request actions
    requestUnderAttack,
    reset,
  };
}
