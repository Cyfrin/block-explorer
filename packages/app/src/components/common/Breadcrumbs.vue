<template>
  <nav aria-label="Breadcrumb">
    <ul class="breadcrumbs">
      <template v-for="(item, index) in items" :key="index">
        <li class="breadcrumb-item">
          <router-link v-if="item.to" class="breadcrumb-link" :to="item.to">
            {{ item.text }}
          </router-link>
          <span v-else class="breadcrumb-current" aria-current="page">
            {{ item.text }}
          </span>
        </li>
        <li v-if="index < items.length - 1" class="breadcrumb-separator" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </li>
      </template>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import type { RouteLocationRaw } from "vue-router";

export interface BreadcrumbItem {
  text: string;
  to?: RouteLocationRaw;
}

defineProps({
  items: {
    type: Array as PropType<BreadcrumbItem[]>,
    default: () => [],
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.breadcrumbs {
  @apply flex flex-wrap items-center gap-1 m-0 p-0 list-none;
}

.breadcrumb-item {
  @apply flex items-center;
}

.breadcrumb-link {
  @apply text-sm no-underline;
  color: var(--text-muted);
  transition: color 100ms ease-out;

  &:hover {
    color: var(--text-secondary);
  }
}

.breadcrumb-current {
  @apply text-sm font-medium;
  color: var(--text-secondary);
}

.breadcrumb-separator {
  @apply flex items-center;
  color: var(--text-faint);

  svg {
    @apply w-3.5 h-3.5;
  }
}
</style>
