<template>
  <div class="contract-not-registered">
    <div class="not-registered-header">
      <div class="icon-wrapper">
        <ExclamationCircleIcon class="icon" />
      </div>
      <span class="title">{{ t("contractRegistration.notRegistered") }}</span>
    </div>
    <p class="description">
      {{ t("contractRegistration.description") }}
    </p>
    <p class="warning">{{ t("contractRegistration.warning") }}</p>

    <!-- Request Attackable Mode section -->
    <div class="attackable-section">
      <p class="section-title">{{ t("contractRegistration.requestAttackableSection") }}</p>
      <p class="section-description">{{ t("contractRegistration.requestAttackableDescription") }}</p>

      <!-- Not connected state -->
      <template v-if="!isWalletConnected">
        <p class="action-prompt">
          <button
            type="button"
            class="connect-link"
            :disabled="isConnectPending || !isMetamaskInstalled"
            @click="registration.connect"
          >
            {{ connectButtonText }}
          </button>
          <template v-if="isMetamaskInstalled && !isConnectPending">
            {{ " " + t("contractRegistration.promptSuffix") }}
          </template>
        </p>
      </template>

      <!-- Connected state -->
      <template v-else>
        <p class="dao-approval-notice">
          {{ t("authorization.requiresDAOApproval") }}
        </p>
        <button type="button" class="request-button" @click="handleRequestAttackableMode">
          {{ t("contractRegistration.requestAttackableButton") }}
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";

import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/vue/outline";

import useContext from "@/composables/useContext";
import useContractRegistration from "@/composables/useContractRegistration";

const props = withDefaults(
  defineProps<{
    contractAddress: string;
    creatorAddress?: string | null;
    // Optional state overrides for Storybook - when provided, these take precedence
    overrideWalletConnected?: boolean;
    overrideMetamaskInstalled?: boolean;
    overrideConnectPending?: boolean;
    overrideRegistering?: boolean;
    overrideError?: string | null;
    overrideTxHash?: string | null;
    overrideIsOwner?: boolean;
  }>(),
  {
    creatorAddress: null,
    overrideWalletConnected: undefined,
    overrideMetamaskInstalled: undefined,
    overrideConnectPending: undefined,
    overrideRegistering: undefined,
    overrideError: undefined,
    overrideTxHash: undefined,
    overrideIsOwner: undefined,
  }
);

const emit = defineEmits<{
  (e: "request-attackable-mode"): void;
}>();

const { t } = useI18n();
const context = useContext();

const registration = useContractRegistration(context);

// Use override props if provided, otherwise fall back to composable state
const isWalletConnected = computed(() =>
  props.overrideWalletConnected !== undefined ? props.overrideWalletConnected : registration.isWalletConnected.value
);
const isMetamaskInstalled = computed(() =>
  props.overrideMetamaskInstalled !== undefined
    ? props.overrideMetamaskInstalled
    : registration.isMetamaskInstalled.value
);
const isConnectPending = computed(() =>
  props.overrideConnectPending !== undefined ? props.overrideConnectPending : registration.isConnectPending.value
);
const isRegistering = computed(() =>
  props.overrideRegistering !== undefined ? props.overrideRegistering : registration.isRegistering.value
);
const registrationError = computed(() =>
  props.overrideError !== undefined ? props.overrideError : registration.registrationError.value
);
const registrationTxHash = computed(() =>
  props.overrideTxHash !== undefined ? props.overrideTxHash : registration.registrationTxHash.value
);

// Check if connected wallet is the contract owner/deployer
const isOwner = computed(() => {
  if (props.overrideIsOwner !== undefined) return props.overrideIsOwner;
  if (!registration.walletAddress.value || !props.creatorAddress) return true; // Assume owner if we can't check
  return registration.walletAddress.value.toLowerCase() === props.creatorAddress.toLowerCase();
});

const connectButtonText = computed(() => {
  if (isConnectPending.value) {
    return t("contractRegistration.connecting");
  }
  if (!isMetamaskInstalled.value) {
    return t("contractRegistration.noWallet");
  }
  return t("contractRegistration.connectWallet");
});

const txLink = computed(() => {
  if (!registrationTxHash.value) return "";
  return `/tx/${registrationTxHash.value}`;
});

const handleRegister = () => {
  registration.registerContract(props.contractAddress);
};

const handleRequestAttackableMode = () => {
  emit("request-attackable-mode");
};

const refreshPage = () => {
  window.location.reload();
};

onMounted(async () => {
  // Skip wallet initialization if using overrides (Storybook mode)
  if (props.overrideWalletConnected !== undefined) return;

  // Initialize wallet state on mount
  const { initialize } = await import("@/composables/useWallet").then((m) => {
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
  initialize();
});
</script>

<style scoped lang="scss">
.contract-not-registered {
  @apply flex flex-col gap-2 rounded-lg border p-4;
  @apply min-w-0 max-w-full;
  border-color: var(--warning-border, var(--border-default));
  background-color: var(--warning-bg, var(--bg-secondary));

  .not-registered-header {
    @apply flex items-center gap-2;
  }

  .icon-wrapper {
    @apply flex-shrink-0;
  }

  .icon {
    @apply h-5 w-5;
    color: var(--warning, #f59e0b);
  }

  .title {
    @apply text-sm font-semibold;
    color: var(--warning-text, var(--text-primary));
  }

  .description {
    @apply text-sm leading-relaxed wrap-break-word;
    color: var(--text-secondary);
  }

  .warning {
    @apply text-xs italic;
    color: var(--text-muted);
  }

  .registration-section {
    @apply mt-3 border-t pt-3;
    border-color: var(--border-subtle, var(--border-default));
  }

  .register-prompt {
    @apply text-sm;
    color: var(--text-secondary);
  }

  .not-owner-message {
    @apply text-sm;
    color: var(--text-muted);
  }

  .connect-link {
    @apply font-medium underline;
    color: var(--accent);

    &:hover:not(:disabled) {
      color: var(--accent-hover);
    }

    &:disabled {
      @apply cursor-not-allowed opacity-50;
    }
  }

  .register-button {
    @apply flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium;
    background-color: var(--accent);
    color: var(--text-on-accent, white);

    &:hover:not(:disabled) {
      background-color: var(--accent-hover);
    }

    &:disabled {
      @apply cursor-not-allowed opacity-50;
    }
  }

  .loading-spinner {
    @apply h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent;
  }

  .success-state {
    @apply flex flex-col items-start gap-2;
  }

  .success-message {
    @apply flex items-center gap-2 text-sm;
    color: var(--success, #10b981);
  }

  .success-icon {
    @apply h-5 w-5;
  }

  .tx-link {
    @apply font-medium underline;
    color: var(--accent);

    &:hover {
      color: var(--accent-hover);
    }
  }

  .refresh-link {
    @apply text-sm;
    @apply font-medium underline;
    color: var(--accent);

    &:hover {
      color: var(--accent-hover);
    }
  }

  .error-message {
    @apply mt-2 text-sm;
    color: var(--error, #ef4444);
  }

  .retry-link {
    @apply ml-2 font-medium underline;
    color: var(--accent);

    &:hover {
      color: var(--accent-hover);
    }
  }

  .attackable-section {
    @apply mt-4 border-t pt-4;
    border-color: var(--border-subtle, var(--border-default));
  }

  .section-title {
    @apply mb-1 text-sm font-semibold;
    color: var(--text-primary);
  }

  .section-description {
    @apply mb-3 text-sm;
    color: var(--text-secondary);
  }

  .action-prompt {
    @apply text-sm;
    color: var(--text-secondary);
  }

  .dao-approval-notice {
    @apply mb-2 text-xs;
    color: var(--text-muted);
  }

  .request-button {
    @apply flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium;
    background-color: var(--accent);
    color: var(--text-on-accent, white);

    &:hover:not(:disabled) {
      background-color: var(--accent-hover);
    }

    &:disabled {
      @apply cursor-not-allowed opacity-50;
    }
  }
}
</style>
