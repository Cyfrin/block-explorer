<template>
  <div class="info-field-byte-data">
    <Disclosure v-slot="{ open }">
      <DisclosureButton
        class="byte-data-disclosure-btn"
        :class="open ? 'rounded-tl-lg rounded-tr-lg' : 'rounded-lg'"
        :data-testid="$testId.byteCodeDropDown"
      >
        <HashLabel :text="value" :subtraction="5" />
        <div class="byte-data-disclosure-icons">
          <CopyButton class="mr-1" tooltipPosition="left" :value="value" />
          <ChevronDownIcon
            :class="open ? 'rotate-180 transform' : ''"
            class="chevron-icon h-5 w-5 transition-transform"
          />
        </div>
      </DisclosureButton>
      <DisclosurePanel class="byte-data-disclosure-panel">
        <div class="byte-data-full-value">{{ value }}</div>
      </DisclosurePanel>
    </Disclosure>
  </div>
</template>

<script lang="ts" setup>
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/vue";
import { ChevronDownIcon } from "@heroicons/vue/solid";

import CopyButton from "@/components/common/CopyButton.vue";
import HashLabel from "@/components/common/HashLabel.vue";

defineProps({
  value: {
    type: String,
    default: "",
    required: true,
  },
});
</script>

<style lang="scss">
.info-field-byte-data {
  .byte-data-disclosure-btn {
    @apply flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium focus:outline-none;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);

    &:hover {
      background-color: var(--bg-hover);
    }
  }
  .byte-data-disclosure-icons {
    @apply flex shrink-0 items-center ml-2;

    .chevron-icon {
      color: var(--text-muted);
    }
  }
  .byte-data-disclosure-panel {
    @apply rounded-bl-lg rounded-br-lg border border-t-0 px-4 py-4;
    border-color: var(--border-default);
    background-color: var(--bg-secondary);

    .byte-data-full-value {
      @apply overflow-hidden whitespace-pre-line break-words break-all font-mono text-sm;
      color: var(--text-secondary);
    }
  }
}
</style>
