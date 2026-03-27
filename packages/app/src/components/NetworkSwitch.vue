<template>
  <Listbox as="div" :model-value="selected" class="network-switch">
    <ListboxButton class="toggle-button">
      <span class="network-item">
        <span class="network-item-label">{{ currentNetwork.l2NetworkName }}</span>
      </span>
      <span class="toggle-button-icon-wrapper">
        <ChevronDownIcon class="toggle-button-icon" aria-hidden="true" />
      </span>
    </ListboxButton>
    <div class="network-list-wrapper">
      <ListboxOptions class="network-list">
        <ListboxOption
          as="template"
          v-for="network in networks"
          :key="network.name"
          :value="network"
          v-slot="{ active, selected }"
        >
          <li class="network-list-item-container" :class="{ active, selected }">
            <component
              :is="selected ? 'label' : 'a'"
              :href="getNetworkUrl(network)"
              class="network-list-item"
              :class="{ selected }"
            >
              <span class="network-item">
                <span class="network-item-label network-list-item-label">{{ network.l2NetworkName }} </span>
              </span>
              <MinusCircleIcon v-if="network.maintenance" class="maintenance-icon" aria-hidden="true" />
            </component>
          </li>
        </ListboxOption>
      </ListboxOptions>
    </div>
  </Listbox>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/vue";
import { MinusCircleIcon } from "@heroicons/vue/outline";
import { ChevronDownIcon } from "@heroicons/vue/solid";

import useContext from "@/composables/useContext";

import type { NetworkConfig } from "@/configs";

import { getWindowLocation } from "@/utils/helpers";

const { networks: allNetworks, currentNetwork } = useContext();
const route = useRoute();
const selected = computed(() => {
  return currentNetwork.value;
});
const networks = computed(() => {
  return allNetworks.value.filter((n) => n.groupId === currentNetwork.value.groupId);
});

const getNetworkUrl = (network: NetworkConfig) => {
  const hostname = getWindowLocation().hostname;

  if (hostname === "localhost" || hostname.endsWith("web.app") || !network.hostnames?.length) {
    return `${route.path}?network=${encodeURIComponent(network.name)}`;
  }
  try {
    const url = new URL(network.hostnames[0]);
    url.pathname = route.path;
    return url.toString();
  } catch {
    return route.path;
  }
};
</script>

<style scoped lang="scss">
.network-switch {
  @apply relative;

  .network-list-wrapper {
    @apply absolute right-0 top-full h-auto w-full lg:w-[260px];
  }

  .network-list {
    @apply absolute right-0 top-1 z-10 mb-1 max-h-56 w-full overflow-auto rounded-lg p-1 text-sm focus:outline-none;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-default);
    box-shadow: var(--shadow-lg);
  }

  .network-list-item-container {
    @apply flex items-center gap-2 px-3 py-2 rounded-md;
    color: var(--text-secondary);

    &:not(.selected) {
      cursor: pointer;
    }

    &.selected {
      color: var(--accent);
      background-color: var(--accent-muted);
    }

    &:not(.selected).active,
    &:not(.selected):hover {
      color: var(--text-primary);
      background-color: var(--bg-hover);
    }

    .network-list-item {
      @apply w-full font-sans text-sm font-normal no-underline;
      color: inherit;

      &:not(.selected) {
        cursor: pointer;
      }
    }
  }

  .toggle-button {
    @apply relative flex w-full min-w-[125px] items-center rounded-md px-3 py-2 font-sans text-sm font-medium;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    transition: all 100ms ease-out;

    &:hover {
      background-color: var(--bg-hover);
      border-color: var(--border-strong);
    }

    &:focus {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
  }

  .network-item {
    @apply mr-4 flex items-center gap-2;

    .network-item-img {
      @apply h-4 w-4 shrink-0;
    }

    .network-item-label {
      @apply block truncate;
    }
  }

  .toggle-button-icon-wrapper {
    @apply pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2;

    .toggle-button-icon {
      @apply h-4 w-4;
      color: var(--text-muted);
    }
  }

  .maintenance-icon {
    @apply h-4 w-4 shrink-0;
    color: var(--warning);
  }
}
</style>
