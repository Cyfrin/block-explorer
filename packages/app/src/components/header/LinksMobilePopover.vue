<template>
  <div class="mobile-nav-links">
    <PopoverButton v-for="item in items" :key="item.to?.name ?? item.url" as="template">
      <router-link v-if="item.to" :to="item.to" class="mobile-nav-link">
        {{ item.label }}
      </router-link>
      <a v-else :href="item.url" target="_blank" rel="noopener" class="mobile-nav-link">
        {{ item.label }}
      </a>
    </PopoverButton>
  </div>
</template>

<script lang="ts" setup>
import { PopoverButton } from "@headlessui/vue";

import type { PropType } from "vue";

type InternalNavigation = {
  label: string;
  to?: { name: string };
  url?: string;
};
defineProps({
  items: {
    type: Array as PropType<InternalNavigation[]>,
    default: () => [],
    required: true,
  },
});
</script>
