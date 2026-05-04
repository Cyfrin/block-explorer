<template>
  <div class="contract-new-deployment">
    <div class="new-deployment-header">
      <div class="icon-wrapper">
        <CheckCircleIcon class="icon" />
      </div>
      <span class="title">{{ t("contractNewDeployment.title") }}</span>
    </div>
    <p class="description">
      {{ t("contractNewDeployment.description") }}
    </p>

    <!-- Action section -->
    <div class="action-section">
      <!-- Not connected state -->
      <template v-if="!isWalletConnected">
        <p class="action-prompt">
          {{ t("contractNewDeployment.promptPrefix") }}
          <button
            type="button"
            class="connect-link"
            :disabled="isConnectPending || !isMetamaskInstalled"
            @click="handleConnect"
          >
            {{ connectButtonText }}
          </button>
          <template v-if="isMetamaskInstalled && !isConnectPending">
            {{ " " + t("contractNewDeployment.promptSuffix") }}
          </template>
        </p>
      </template>

      <!-- Connected but not owner state -->
      <template v-else-if="!isOwner">
        <p class="not-owner-message">
          {{ t("contractNewDeployment.notOwner") }}
        </p>
      </template>

      <!-- Connected and is owner state -->
      <template v-else>
        <div class="action-buttons">
          <button type="button" class="request-button" @click="handleRequestAttackableMode">
            {{ t("contractNewDeployment.requestButton") }}
          </button>
          <button type="button" class="production-link" @click="handleGoToProduction">
            {{ t("contractNewDeployment.goToProductionLink") }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, toRef } from "vue";
import { useI18n } from "vue-i18n";

import { CheckCircleIcon } from "@heroicons/vue/outline";

import useContext from "@/composables/useContext";
import useContractAuthorization from "@/composables/useContractAuthorization";

const props = withDefaults(
  defineProps<{
    contractAddress: string;
    creatorAddress?: string | null;
    // Optional state overrides for Storybook
    overrideWalletConnected?: boolean;
    overrideMetamaskInstalled?: boolean;
    overrideConnectPending?: boolean;
    overrideIsOwner?: boolean;
  }>(),
  {
    creatorAddress: null,
    overrideWalletConnected: undefined,
    overrideMetamaskInstalled: undefined,
    overrideConnectPending: undefined,
    overrideIsOwner: undefined,
  }
);

const emit = defineEmits<{
  (e: "request-attackable-mode"): void;
  (e: "go-to-production"): void;
}>();

const { t } = useI18n();
const context = useContext();

// Internal wallet state
const internalWalletConnected = ref(false);
const internalMetamaskInstalled = ref(true);
const internalConnectPending = ref(false);
const internalWalletAddress = ref<string | null>(null);

// Use override props if provided, otherwise fall back to internal state
const isWalletConnected = computed(() =>
  props.overrideWalletConnected !== undefined ? props.overrideWalletConnected : internalWalletConnected.value
);
const isMetamaskInstalled = computed(() =>
  props.overrideMetamaskInstalled !== undefined ? props.overrideMetamaskInstalled : internalMetamaskInstalled.value
);
const isConnectPending = computed(() =>
  props.overrideConnectPending !== undefined ? props.overrideConnectPending : internalConnectPending.value
);

// Fetch authorization from indexed data
const { isAuthorized, isLoading: isAuthLoading } = useContractAuthorization(
  toRef(props, "contractAddress"),
  internalWalletAddress,
  context
);

// Check if connected wallet is the authorized owner
const isOwner = computed(() => {
  if (props.overrideIsOwner !== undefined) return props.overrideIsOwner;
  if (isAuthLoading.value) return false; // Don't show buttons while loading
  return isAuthorized.value;
});

const connectButtonText = computed(() => {
  if (isConnectPending.value) {
    return t("common.connecting");
  }
  if (!isMetamaskInstalled.value) {
    return t("contractNewDeployment.noWallet");
  }
  return t("contractNewDeployment.connectWallet");
});

// Wallet connection handler
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type WalletModule = Awaited<ReturnType<typeof import("@/composables/useWallet").default>>;
let walletModule: WalletModule | null = null;

const handleConnect = async () => {
  if (!walletModule) return;
  internalConnectPending.value = true;
  try {
    await walletModule.connect();
    internalWalletConnected.value = !!walletModule.address.value;
    internalWalletAddress.value = walletModule.address.value;
  } finally {
    internalConnectPending.value = false;
  }
};

const handleRequestAttackableMode = () => {
  emit("request-attackable-mode");
};

const handleGoToProduction = () => {
  emit("go-to-production");
};

onMounted(async () => {
  // Skip wallet initialization if using overrides (Storybook mode)
  if (props.overrideWalletConnected !== undefined) return;

  // Initialize wallet state on mount
  const wm = await import("@/composables/useWallet").then((m) => {
    return m.default({
      currentNetwork: computed(() => ({
        ...context.currentNetwork.value,
        explorerUrl: context.currentNetwork.value.rpcUrl,
        chainName: context.currentNetwork.value.l2NetworkName,
        l1ChainId: null as unknown as number,
      })),
      getL2Provider: () => context.getL2Provider(),
    });
  });
  walletModule = wm;

  // Check if MetaMask is installed
  internalMetamaskInstalled.value =
    typeof window !== "undefined" && !!(window as unknown as { ethereum?: unknown }).ethereum;

  // Initialize and check current connection
  wm.initialize();
  internalWalletConnected.value = !!wm.address.value;
  internalWalletAddress.value = wm.address.value;
});
</script>

<style scoped lang="scss">
.contract-new-deployment {
  @apply mt-4 flex flex-col gap-2 rounded-lg border p-4;
  @apply min-w-0 max-w-full;
  border-color: var(--success-border, var(--border-default));
  background-color: var(--success-bg, var(--bg-secondary));

  .new-deployment-header {
    @apply flex items-center gap-2;
  }

  .icon-wrapper {
    @apply flex-shrink-0;
  }

  .icon {
    @apply h-5 w-5;
    color: var(--success, #10b981);
  }

  .title {
    @apply text-sm font-semibold;
    color: var(--success-text, var(--text-primary));
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

  .action-buttons {
    @apply flex flex-col gap-3;
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

  .production-link {
    @apply text-left text-sm;
    color: var(--text-muted);

    &:hover {
      color: var(--text-secondary);
      text-decoration: underline;
    }
  }
}
</style>
