<template>
  <button v-if="!address" class="header-wallet-btn" :disabled="isConnectPending" @click="connect">
    <CreditCardIcon class="btn-icon" />
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

import { CreditCardIcon } from "@heroicons/vue/outline";

import useContext from "@/composables/useContext";
import useWallet from "@/composables/useWallet";

import { formatShortAddress } from "@/utils/formatters";

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
