<template>
  <button v-if="!address" class="header-wallet-btn" :disabled="isConnectPending" @click="connect">
    <WalletIcon class="btn-icon" />
    <span>{{ isConnectPending ? t("connectMetamaskButton.connecting") : t("connectMetamaskButton.label") }}</span>
  </button>
  <div v-else class="wallet-dropdown-wrapper" ref="dropdownRef">
    <button class="header-wallet-btn connected" @click="isOpen = !isOpen">
      <span class="address-dot" />
      <span>{{ shortenedAddress }}</span>
    </button>
    <div v-if="isOpen" class="wallet-dropdown">
      <div class="dropdown-address">{{ address }}</div>
      <button class="disconnect-btn" @click="handleDisconnect">
        {{ t("connectMetamaskButton.disconnect") }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import useContext from "@/composables/useContext";
import useWallet from "@/composables/useWallet";

import { formatShortAddress } from "@/utils/formatters";

// Inline wallet icon (Heroicons outline)
const WalletIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1 0-6h.75A2.25 2.25 0 0 1 18 6v0a2.25 2.25 0 0 1-2.25 2.25H15M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>`,
};

const { t } = useI18n();
const context = useContext();

const { address, isConnectPending, connect, disconnect } = useWallet({
  ...context,
  currentNetwork: computed(() => ({
    explorerUrl: context.currentNetwork.value.rpcUrl,
    chainName: context.currentNetwork.value.l2NetworkName,
    l1ChainId: null as unknown as number,
    ...context.currentNetwork.value,
  })),
});

const shortenedAddress = computed(() => formatShortAddress(address.value));

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const handleDisconnect = () => {
  disconnect();
  isOpen.value = false;
};

const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener("click", handleClickOutside));
onBeforeUnmount(() => document.removeEventListener("click", handleClickOutside));
</script>

<style lang="scss" scoped>
.wallet-dropdown-wrapper {
  @apply relative;
}

.header-wallet-btn {
  @apply flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  background-color: transparent;

  &:hover {
    color: var(--text-primary);
    background-color: var(--bg-hover);
  }

  &:disabled {
    @apply cursor-not-allowed opacity-50;
  }

  &.connected {
    color: var(--text-primary);
  }

  .btn-icon {
    @apply h-4 w-4;
  }

  .address-dot {
    @apply h-2 w-2 rounded-full;
    background-color: var(--success);
  }
}

.wallet-dropdown {
  @apply absolute right-0 top-full mt-1 min-w-[200px] rounded-lg p-3;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-lg);
  z-index: 50;
}

.dropdown-address {
  @apply mb-3 break-all text-xs font-mono;
  color: var(--text-secondary);
}

.disconnect-btn {
  @apply w-full rounded-md px-3 py-1.5 text-sm font-medium transition-colors;
  color: var(--error-text);
  background-color: var(--error-muted);

  &:hover {
    opacity: 0.8;
  }
}
</style>
