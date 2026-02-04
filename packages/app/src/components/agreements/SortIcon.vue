<template>
  <span class="sort-icon" :class="{ active: direction !== null }">
    <ChevronUpIcon v-if="direction === 'asc'" class="icon" />
    <ChevronDownIcon v-else-if="direction === 'desc'" class="icon" />
    <SelectorIcon v-else class="icon inactive" />
  </span>
</template>

<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon, SelectorIcon } from "@heroicons/vue/solid";

defineProps<{
  direction: "asc" | "desc" | null;
}>();
</script>

<style lang="scss" scoped>
.sort-icon {
  @apply inline-flex items-center;

  .icon {
    @apply h-4 w-4;
    color: var(--text-primary);
  }

  .icon.inactive {
    @apply opacity-40;
    color: var(--text-muted);
  }

  &.active .icon {
    color: var(--accent);
  }
}
</style>
