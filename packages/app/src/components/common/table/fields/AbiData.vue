<template>
  <div class="info-field-abi-data">
    <Disclosure v-slot="{ open }">
      <DisclosureButton
        class="abi-data-disclosure-btn"
        :class="open ? 'rounded-tl-lg rounded-tr-lg' : 'rounded-lg'"
        :data-testid="$testId.abiDataDropDown"
      >
        {{ truncatedAbi }}

        <div class="abi-data-disclosure-icons">
          <CopyButton class="mr-1" tooltipPosition="left" :value="value" />
          <ChevronDownIcon
            :class="open ? 'rotate-180 transform' : ''"
            class="chevron-icon h-5 w-5 transition-transform"
          />
        </div>
      </DisclosureButton>
      <DisclosurePanel class="abi-data-disclosure-panel">
        <div class="abi-data-full-value">{{ value }}</div>
      </DisclosurePanel>
    </Disclosure>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/vue";
import { ChevronDownIcon } from "@heroicons/vue/solid";

import CopyButton from "@/components/common/CopyButton.vue";

const props = defineProps({
  value: {
    type: String,
    default: "",
    required: true,
  },
});

const truncatedAbi = computed<string>(() => {
  return props.value.replace(/(.{600})..+/, "$1...");
});
</script>

<style lang="scss">
.info-field-abi-data {
  .abi-data-disclosure-btn {
    @apply flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium focus:outline-none [word-break:break-word];
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);

    &:hover {
      background-color: var(--bg-hover);
    }
  }
  .abi-data-disclosure-icons {
    @apply flex shrink-0 items-center ml-2;

    .chevron-icon {
      color: var(--text-muted);
    }
  }
  .abi-data-disclosure-panel {
    @apply rounded-bl-lg rounded-br-lg border border-t-0 px-4 py-4;
    border-color: var(--border-default);
    background-color: var(--bg-secondary);

    .abi-data-full-value {
      @apply overflow-hidden whitespace-pre-line break-words break-all font-mono text-sm;
      color: var(--text-secondary);
    }
  }
}
</style>
