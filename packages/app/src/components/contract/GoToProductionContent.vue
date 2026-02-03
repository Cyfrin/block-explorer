<template>
  <div class="go-to-production-content">
    <!-- Header -->
    <div class="modal-header">
      <h2 class="modal-title">{{ t("goToProduction.title") }}</h2>
      <button type="button" class="close-button" @click="$emit('close')">
        <XIcon class="close-icon" />
      </button>
    </div>

    <!-- Content -->
    <div class="modal-content">
      <!-- Confirmation state -->
      <template v-if="!currentTxHash">
        <div class="warning-banner">
          <ExclamationIcon class="warning-icon" />
          <div class="warning-text">
            <p class="warning-title">{{ t("goToProduction.warningTitle") }}</p>
            <p class="warning-description">{{ t("goToProduction.warningDescription") }}</p>
          </div>
        </div>

        <!-- Contracts affected section -->
        <div class="contracts-affected">
          <h3 class="section-title">
            {{ t("goToProduction.contractsAffectedTitle", coveredAccountsCount) }}
          </h3>
          <p class="section-description">
            {{ t("goToProduction.contractsAffectedDescription") }}
          </p>

          <ul class="contracts-list">
            <li v-for="account in coveredAccounts" :key="account.accountAddress" class="contract-item">
              <div class="contract-info">
                <span class="contract-address monospace">{{ shortValue(account.accountAddress) }}</span>
                <span v-if="isCurrentContract(account.accountAddress)" class="current-badge">
                  {{ t("goToProduction.currentContract") }}
                </span>
              </div>
              <span class="child-scope">{{ getChildScopeLabel(account.childContractScope) }}</span>
            </li>
          </ul>
        </div>

        <!-- Authorization Warning -->
        <div v-if="!isAuthLoading && !isAuthorizedForAll" class="auth-warning">
          <ExclamationCircleIcon class="auth-warning-icon" />
          <div class="auth-warning-text">
            <p class="auth-warning-title">{{ t("authorization.notAuthorizedForAll") }}</p>
            <p class="auth-warning-description">{{ t("authorization.unauthorizedContracts") }}</p>
            <ul class="unauthorized-list">
              <li v-for="contract in unauthorizedContracts" :key="contract.accountAddress">
                {{ shortValue(contract.accountAddress) }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="currentError" class="error-message">
          <ExclamationCircleIcon class="error-icon" />
          <span>{{ currentError }}</span>
          <button type="button" class="retry-link" @click="handleReset">
            {{ t("common.tryAgain") }}
          </button>
        </div>
      </template>

      <!-- Success state -->
      <template v-else>
        <div class="success-banner">
          <CheckCircleIcon class="success-icon" />
          <div class="success-text">
            <p class="success-title">{{ t("goToProduction.successTitle") }}</p>
            <p class="success-description">{{ t("goToProduction.successDescription") }}</p>
          </div>
        </div>
        <a :href="txLink" target="_blank" class="tx-link">
          {{ t("goToProduction.viewTransaction") }}
          <ExternalLinkIcon class="external-icon" />
        </a>
      </template>
    </div>

    <!-- Footer -->
    <div class="modal-footer">
      <template v-if="!currentTxHash">
        <button type="button" class="btn-secondary" :disabled="currentIsProcessing" @click="$emit('close')">
          {{ t("common.cancel") }}
        </button>
        <button
          type="button"
          class="btn-danger"
          :disabled="currentIsProcessing || isAuthLoading || !isAuthorizedForAll"
          @click="handleConfirm"
        >
          <span v-if="currentIsProcessing" class="loading-spinner" />
          {{ currentIsProcessing ? t("common.processing") : t("goToProduction.confirmButton") }}
        </button>
      </template>
      <template v-else>
        <button type="button" class="btn-primary" @click="handleSuccess">
          {{ t("common.done") }}
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { ExclamationIcon } from "@heroicons/vue/outline";
import { CheckCircleIcon, ExclamationCircleIcon, ExternalLinkIcon, XIcon } from "@heroicons/vue/solid";

import useAgreementDetails from "@/composables/useAgreementDetails";
import useContext from "@/composables/useContext";
import { fetchAuthorizedOwners } from "@/composables/useContractAuthorization";
import useGoToProduction from "@/composables/useGoToProduction";

import type { PropType } from "vue";

import { ChildContractScope } from "@/types";
import { shortValue } from "@/utils/formatters";

const props = defineProps({
  contractAddress: {
    type: String,
    required: true,
  },
  agreementAddress: {
    type: String,
    required: true,
  },
  // Override props for Storybook
  overrideProcessing: {
    type: Boolean,
    default: undefined,
  },
  overrideError: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  overrideTxHash: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  // Override for authorization state (Storybook)
  overrideIsAuthorizedForAll: {
    type: Boolean,
    default: undefined,
  },
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "success"): void;
}>();

const { t } = useI18n();
const context = useContext();

const { isProcessing, error, txHash, goToProduction, reset } = useGoToProduction();

// Wallet state
const walletAddress = ref<string | null>(null);
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type WalletModule = Awaited<ReturnType<typeof import("@/composables/useWallet").default>>;
let walletModule: WalletModule | null = null;

// Fetch agreement details to get covered accounts
const { agreement } = useAgreementDetails(toRef(props, "agreementAddress"));

// Computed properties for contracts list
const coveredAccounts = computed(() => agreement.value?.coveredAccounts ?? []);
const coveredAccountsCount = computed(() => coveredAccounts.value.length);

const isCurrentContract = (address: string) => address.toLowerCase() === props.contractAddress.toLowerCase();

// Authorization state for all covered contracts
interface AuthorizationInfo {
  authorizedOwner: string | null;
  isDeployedViaBattleChain: boolean;
}
const authorizationMap = ref<Record<string, AuthorizationInfo>>({});
const isAuthLoading = ref(false);

const fetchAllAuthorizations = async () => {
  if (!coveredAccounts.value.length || props.overrideIsAuthorizedForAll !== undefined) return;

  isAuthLoading.value = true;
  try {
    const addresses = coveredAccounts.value.map((a) => a.accountAddress);
    const response = await fetchAuthorizedOwners(addresses, context);
    authorizationMap.value = response;
  } finally {
    isAuthLoading.value = false;
  }
};

// Check if current wallet is authorized for all contracts in scope
const isAuthorizedForAll = computed(() => {
  if (props.overrideIsAuthorizedForAll !== undefined) return props.overrideIsAuthorizedForAll;
  if (!walletAddress.value || !coveredAccounts.value.length) return false;
  if (isAuthLoading.value) return false;

  return coveredAccounts.value.every((account) => {
    const authInfo = authorizationMap.value[account.accountAddress.toLowerCase()];
    if (!authInfo) return false;
    const authorizedOwner = authInfo.authorizedOwner;
    return authorizedOwner && walletAddress.value?.toLowerCase() === authorizedOwner.toLowerCase();
  });
});

// Get list of contracts the user is not authorized for
const unauthorizedContracts = computed(() => {
  if (!walletAddress.value || props.overrideIsAuthorizedForAll !== undefined) return [];

  return coveredAccounts.value.filter((account) => {
    const authInfo = authorizationMap.value[account.accountAddress.toLowerCase()];
    const authorizedOwner = authInfo?.authorizedOwner;
    return !authorizedOwner || walletAddress.value?.toLowerCase() !== authorizedOwner.toLowerCase();
  });
});

// Fetch authorizations when covered accounts change
watch(coveredAccounts, fetchAllAuthorizations, { immediate: true });

const getChildScopeLabel = (scope: ChildContractScope): string => {
  switch (scope) {
    case ChildContractScope.None:
      return t("goToProduction.childScope.none");
    case ChildContractScope.ExistingOnly:
      return t("goToProduction.childScope.existingOnly");
    case ChildContractScope.All:
      return t("goToProduction.childScope.all");
    case ChildContractScope.FutureOnly:
      return t("goToProduction.childScope.futureOnly");
    default:
      return t("goToProduction.childScope.none");
  }
};

// Use overrides or real values
const currentIsProcessing = computed(() => props.overrideProcessing ?? isProcessing.value);
const currentError = computed(() => props.overrideError ?? error.value);
const currentTxHash = computed(() => props.overrideTxHash ?? txHash.value);

const txLink = computed(() => {
  if (!currentTxHash.value) return "";
  return `/tx/${currentTxHash.value}`;
});

const handleConfirm = async () => {
  // Skip actual request if using overrides (Storybook mode)
  if (props.overrideProcessing !== undefined) return;
  await goToProduction(props.agreementAddress);
};

const handleReset = () => {
  // Skip if using overrides (Storybook mode)
  if (props.overrideError !== undefined) return;
  reset();
};

const handleSuccess = () => {
  emit("success");
};

const resetState = () => {
  reset();
};

// Expose reset for parent component
defineExpose({ reset: resetState });

// Initialize wallet connection on mount
onMounted(async () => {
  // Skip wallet initialization if using overrides (Storybook mode)
  if (props.overrideIsAuthorizedForAll !== undefined) return;

  walletModule = await import("@/composables/useWallet").then((m) => {
    return m.default({
      isReady: context.isReady,
      currentNetwork: computed(() => ({
        ...context.currentNetwork.value,
        explorerUrl: context.currentNetwork.value.rpcUrl,
        chainName: context.currentNetwork.value.l2NetworkName,
        l1ChainId: null as unknown as number,
      })),
      networks: context.networks,
      getL2Provider: () => context.getL2Provider(),
    });
  });

  walletModule.initialize();
  walletAddress.value = walletModule.address.value;

  // Watch for wallet changes
  watch(
    () => walletModule?.address.value,
    (newAddress) => {
      walletAddress.value = newAddress ?? null;
    }
  );
});
</script>

<style scoped lang="scss">
.go-to-production-content {
  @apply w-full max-w-md rounded-lg shadow-xl;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);
}

.modal-header {
  @apply flex items-center justify-between border-b px-4 py-3 sm:px-6;
  border-color: var(--border-default);
}

.modal-title {
  @apply text-lg font-semibold;
  color: var(--text-primary);
}

.close-button {
  @apply rounded p-1;
  color: var(--text-muted);

  &:hover {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
  }
}

.close-icon {
  @apply h-5 w-5;
}

.modal-content {
  @apply space-y-4 px-4 py-4 sm:px-6;
}

.warning-banner {
  @apply flex gap-3 rounded-lg border p-4;
  border-color: var(--warning-border, var(--border-default));
  background-color: var(--warning-bg, var(--bg-secondary));
}

.warning-icon {
  @apply h-5 w-5 shrink-0;
  color: var(--warning, #f59e0b);
}

.warning-text {
  @apply flex flex-col gap-1;
}

.warning-title {
  @apply text-sm font-semibold;
  color: var(--warning-text, var(--text-primary));
}

.warning-description {
  @apply text-sm leading-relaxed;
  color: var(--text-secondary);
}

.contracts-affected {
  .section-title {
    @apply text-base font-medium;
    color: var(--text-primary);
  }

  .section-description {
    @apply mt-1 text-sm;
    color: var(--text-muted);
  }
}

.contracts-list {
  @apply mt-3 space-y-2 pl-0;
  list-style: none;

  .contract-item {
    @apply flex items-center justify-between gap-2 rounded-lg border p-3;
    border-color: var(--border-default);
    background-color: var(--bg-secondary);
  }

  .contract-info {
    @apply flex items-center gap-2;
  }

  .contract-address {
    @apply text-sm;
    color: var(--text-primary);
  }

  .current-badge {
    @apply rounded-full px-2 py-0.5 text-xs font-medium;
    background-color: var(--accent-muted);
    color: var(--accent-text);
  }

  .child-scope {
    @apply text-xs;
    color: var(--text-muted);
  }
}

.auth-warning {
  @apply flex gap-3 rounded-lg border p-4;
  border-color: var(--error-border, var(--border-default));
  background-color: var(--error-muted);
}

.auth-warning-icon {
  @apply h-5 w-5 shrink-0;
  color: var(--error);
}

.auth-warning-text {
  @apply flex flex-col gap-1;
}

.auth-warning-title {
  @apply text-sm font-semibold;
  color: var(--error-text);
}

.auth-warning-description {
  @apply text-sm;
  color: var(--text-secondary);
}

.unauthorized-list {
  @apply mt-2 space-y-1 pl-0;
  list-style: none;

  li {
    @apply font-mono text-xs;
    color: var(--text-muted);
  }
}

.error-message {
  @apply flex items-start gap-2 rounded-md p-3;
  background-color: var(--error-muted);
  color: var(--error-text);
}

.error-icon {
  @apply h-5 w-5 shrink-0;
  color: var(--error);
}

.retry-link {
  @apply ml-auto shrink-0 text-sm font-medium underline;
  color: var(--accent);

  &:hover {
    color: var(--accent-hover);
  }
}

.success-banner {
  @apply flex items-start gap-3 rounded-lg p-4;
  background-color: var(--success-muted);
}

.success-icon {
  @apply h-6 w-6 shrink-0;
  color: var(--success);
}

.success-text {
  @apply flex flex-col gap-1;
}

.success-title {
  @apply font-medium;
  color: var(--success-text);
}

.success-description {
  @apply text-sm;
  color: var(--text-secondary);
}

.tx-link {
  @apply flex items-center justify-center gap-1 text-sm font-medium;
  color: var(--accent);

  &:hover {
    color: var(--accent-hover);
  }
}

.external-icon {
  @apply h-4 w-4;
}

.modal-footer {
  @apply flex justify-end gap-3 border-t px-4 py-3 sm:px-6;
  border-color: var(--border-default);
}

.btn-secondary,
.btn-danger,
.btn-primary {
  @apply flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors;

  &:disabled {
    @apply cursor-not-allowed opacity-50;
  }
}

.btn-secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);

  &:hover:not(:disabled) {
    background-color: var(--bg-quaternary);
  }
}

.btn-danger {
  background-color: var(--error, #ef4444);
  color: white;

  &:hover:not(:disabled) {
    background-color: var(--error-hover, #dc2626);
  }
}

.btn-primary {
  background-color: var(--accent);
  color: white;

  &:hover:not(:disabled) {
    background-color: var(--accent-hover);
  }
}

.loading-spinner {
  @apply h-4 w-4 animate-spin rounded-full border-2;
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}
</style>
