<template>
  <div class="request-under-attack-prompt">
    <div class="prompt-header">
      <div class="icon-wrapper">
        <ExclamationCircleIcon class="icon" />
      </div>
      <span class="title">{{ t("requestAttackableMode.title") }}</span>
    </div>
    <p class="description">
      {{ t("requestAttackableMode.description") }}
    </p>

    <!-- Action section -->
    <div class="action-section">
      <!-- Success state -->
      <div v-if="requestTxHash" class="success-state">
        <div class="success-message">
          <CheckCircleIcon class="success-icon" />
          <span>{{ t("requestAttackableMode.success") }}</span>
          <a :href="txLink" target="_blank" class="tx-link">
            {{ t("requestAttackableMode.viewTransaction") }}
          </a>
        </div>
        <button type="button" class="refresh-link" @click="refreshPage">
          {{ t("requestAttackableMode.refreshPage") }}
        </button>
      </div>

      <!-- Not connected state -->
      <template v-else-if="!isWalletConnected">
        <p class="action-prompt">
          {{ t("requestAttackableMode.promptPrefix") }}
          <button
            type="button"
            class="connect-link"
            :disabled="isConnectPending || !isMetamaskInstalled"
            @click="request.connect"
          >
            {{ connectButtonText }}
          </button>
          <template v-if="isMetamaskInstalled && !isConnectPending">
            {{ " " + t("requestAttackableMode.promptSuffix") }}
          </template>
        </p>
      </template>

      <!-- Connected but not owner state -->
      <template v-else-if="!isOwner">
        <p class="not-owner-message">
          {{ t("requestAttackableMode.notOwner") }}
        </p>
      </template>

      <!-- Connected and is owner state -->
      <template v-else>
        <button type="button" class="request-button" :disabled="isRequesting" @click="handleRequest">
          <span v-if="isRequesting" class="loading-spinner" />
          {{ isRequesting ? t("requestAttackableMode.requesting") : t("requestAttackableMode.requestButton") }}
        </button>
        <p v-if="requestError" class="error-message">
          {{ requestError }}
          <button type="button" class="retry-link" @click="request.reset">
            {{ t("requestAttackableMode.tryAgain") }}
          </button>
        </p>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";

import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/vue/outline";

import useContext from "@/composables/useContext";
import useRequestUnderAttack from "@/composables/useRequestUnderAttack";

const props = withDefaults(
  defineProps<{
    contractAddress: string;
    agreementAddress: string;
    creatorAddress?: string | null;
    // Optional state overrides for Storybook - when provided, these take precedence
    overrideWalletConnected?: boolean;
    overrideMetamaskInstalled?: boolean;
    overrideConnectPending?: boolean;
    overrideRequesting?: boolean;
    overrideError?: string | null;
    overrideTxHash?: string | null;
    overrideIsOwner?: boolean;
  }>(),
  {
    creatorAddress: null,
    overrideWalletConnected: undefined,
    overrideMetamaskInstalled: undefined,
    overrideConnectPending: undefined,
    overrideRequesting: undefined,
    overrideError: undefined,
    overrideTxHash: undefined,
    overrideIsOwner: undefined,
  }
);

const { t } = useI18n();
const context = useContext();

const request = useRequestUnderAttack(context);

// Use override props if provided, otherwise fall back to composable state
const isWalletConnected = computed(() =>
  props.overrideWalletConnected !== undefined ? props.overrideWalletConnected : request.isWalletConnected.value
);
const isMetamaskInstalled = computed(() =>
  props.overrideMetamaskInstalled !== undefined ? props.overrideMetamaskInstalled : request.isMetamaskInstalled.value
);
const isConnectPending = computed(() =>
  props.overrideConnectPending !== undefined ? props.overrideConnectPending : request.isConnectPending.value
);
const isRequesting = computed(() =>
  props.overrideRequesting !== undefined ? props.overrideRequesting : request.isRequesting.value
);
const requestError = computed(() =>
  props.overrideError !== undefined ? props.overrideError : request.requestError.value
);
const requestTxHash = computed(() =>
  props.overrideTxHash !== undefined ? props.overrideTxHash : request.requestTxHash.value
);

// Check if connected wallet is the contract owner/deployer
const isOwner = computed(() => {
  if (props.overrideIsOwner !== undefined) return props.overrideIsOwner;
  if (!request.walletAddress.value || !props.creatorAddress) return true; // Assume owner if we can't check
  return request.walletAddress.value.toLowerCase() === props.creatorAddress.toLowerCase();
});

const connectButtonText = computed(() => {
  if (isConnectPending.value) {
    return t("requestAttackableMode.connecting");
  }
  if (!isMetamaskInstalled.value) {
    return t("requestAttackableMode.noWallet");
  }
  return t("requestAttackableMode.connectWallet");
});

const txLink = computed(() => {
  if (!requestTxHash.value) return "";
  return `/tx/${requestTxHash.value}`;
});

const handleRequest = () => {
  request.requestUnderAttack(props.contractAddress, props.agreementAddress);
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
.request-under-attack-prompt {
  @apply mb-4 flex flex-col gap-2 rounded-lg border p-4;
  @apply min-w-0 max-w-full;
  border-color: var(--warning-border, var(--border-default));
  background-color: var(--warning-bg, var(--bg-secondary));

  .prompt-header {
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

  .action-section {
    @apply mt-3 border-t pt-3;
    border-color: var(--border-subtle, var(--border-default));
  }

  .action-prompt {
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

  .request-button {
    @apply flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium;
    background-color: var(--warning, #f59e0b);
    color: var(--text-on-warning, white);

    &:hover:not(:disabled) {
      background-color: var(--warning-hover, #d97706);
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
}
</style>
