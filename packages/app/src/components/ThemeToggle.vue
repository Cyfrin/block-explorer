<template>
  <button type="button" class="theme-toggle" :aria-label="ariaLabel" :title="ariaLabel" @click="toggleTheme">
    <!-- Sun icon (light mode) -->
    <svg
      v-if="theme === 'light'"
      class="theme-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>

    <!-- Moon icon (dark mode) -->
    <svg
      v-else-if="theme === 'dark'"
      class="theme-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>

    <!-- System icon (auto mode) -->
    <svg
      v-else
      class="theme-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { useTheme } from "@/composables/useTheme";

const { theme, toggleTheme } = useTheme();

const ariaLabel = computed(() => {
  switch (theme.value) {
    case "light":
      return "Switch to dark mode";
    case "dark":
      return "Switch to system theme";
    default:
      return "Switch to light mode";
  }
});
</script>

<style lang="scss" scoped>
.theme-toggle {
  @apply inline-flex items-center justify-center w-9 h-9 p-2 bg-transparent rounded-md cursor-pointer;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  transition: all 100ms ease-out;

  &:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

.theme-icon {
  @apply w-[18px] h-[18px];
}
</style>
