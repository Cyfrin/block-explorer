<template>
  <div class="no-agreement-warning">
    <div class="warning-header">
      <ShieldExclamationIcon class="warning-icon" />
      <p class="warning-message">{{ t("safeHarbor.noAgreementSimple") }}</p>
    </div>

    <!-- Creation prompt section -->
    <div class="creation-section">
      <!-- Wallet not connected -->
      <template v-if="!effectiveWalletConnected">
        <p class="creation-prompt">
          {{ t("safeHarbor.createAgreement.isYoursPrompt") }}
          <template v-if="effectiveMetamaskInstalled">
            <button type="button" class="connect-link" :disabled="effectiveConnectPending" @click="handleConnect">
              {{ effectiveConnectPending ? t("common.connecting") : t("safeHarbor.createAgreement.connectWallet") }}
            </button>
            {{ t("safeHarbor.createAgreement.toCreateIt") }}
          </template>
          <span v-else class="no-wallet-message">
            {{ t("contractRegistration.noWallet") }}
          </span>
        </p>
      </template>

      <!-- Connected but not owner -->
      <template v-else-if="!effectiveIsOwner">
        <p class="not-owner-message">
          {{ t("safeHarbor.createAgreement.notOwner") }}
        </p>
      </template>

      <!-- Connected and is owner - show create button -->
      <template v-else>
        <button type="button" class="create-button" @click="openModal">
          <PlusIcon class="button-icon" />
          {{ t("safeHarbor.createAgreement.createButton") }}
        </button>
      </template>
    </div>

    <!-- Create Agreement Modal -->
    <CreateAgreementModal
      :is-open="isModalOpen"
      :contract-address="contractAddress"
      @close="closeModal"
      @success="handleSuccess"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { ShieldExclamationIcon } from "@heroicons/vue/outline";
import { PlusIcon } from "@heroicons/vue/solid";

import CreateAgreementModal from "@/components/contract/CreateAgreementModal.vue";

import useAgreementCreation from "@/composables/useAgreementCreation";

import type { PropType } from "vue";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    contractAddress: string;
    creatorAddress?: string | null;
    // Override props for Storybook
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
  (e: "agreementCreated"): void;
}>();

const creation = useAgreementCreation();

const isModalOpen = ref(false);

// Use overrides or real values
const effectiveWalletConnected = computed(() => {
  if (props.overrideWalletConnected !== undefined) return props.overrideWalletConnected;
  return creation.isWalletConnected.value;
});

const effectiveMetamaskInstalled = computed(() => {
  if (props.overrideMetamaskInstalled !== undefined) return props.overrideMetamaskInstalled;
  return creation.isMetamaskInstalled.value;
});

const effectiveConnectPending = computed(() => {
  if (props.overrideConnectPending !== undefined) return props.overrideConnectPending;
  return creation.isConnectPending.value;
});

const effectiveIsOwner = computed(() => {
  if (props.overrideIsOwner !== undefined) return props.overrideIsOwner;
  // If no creatorAddress provided, assume owner
  if (!props.creatorAddress) return true;
  // If wallet not connected, we can't determine ownership yet
  if (!creation.walletAddress.value) return true;
  // Compare addresses case-insensitively
  return creation.walletAddress.value.toLowerCase() === props.creatorAddress.toLowerCase();
});

const handleConnect = () => {
  creation.connect();
};

const openModal = () => {
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const handleSuccess = () => {
  isModalOpen.value = false;
  emit("agreementCreated");
};
</script>

<style scoped lang="scss">
.no-agreement-warning {
  @apply flex flex-col gap-3 rounded-lg border p-4;
  border-color: var(--warning-border, var(--border-default));
  background-color: var(--warning-bg, var(--bg-secondary));

  .warning-header {
    @apply flex items-center gap-2;
  }

  .warning-icon {
    @apply h-5 w-5 shrink-0;
    color: var(--warning, #f59e0b);
  }

  .warning-message {
    @apply text-sm;
    color: var(--text-secondary);
  }

  .creation-section {
    @apply border-t pt-3;
    border-color: var(--border-subtle);
  }

  .creation-prompt {
    @apply text-sm;
    color: var(--text-muted);
  }

  .connect-link {
    @apply font-medium;
    color: var(--accent);

    &:hover:not(:disabled) {
      text-decoration: underline;
    }

    &:disabled {
      @apply cursor-wait;
      color: var(--text-muted);
    }
  }

  .no-wallet-message {
    @apply italic;
    color: var(--text-muted);
  }

  .not-owner-message {
    @apply text-sm;
    color: var(--text-muted);
  }

  .create-button {
    @apply flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors;
    background-color: var(--accent);
    color: white;

    &:hover {
      background-color: var(--accent-hover);
    }

    .button-icon {
      @apply h-4 w-4;
    }
  }
}
</style>
