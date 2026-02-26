<template>
  <div class="alert-container" :class="type">
    <QuestionMarkCircleIcon v-if="type === 'notification'" class="info-tooltip-icon" aria-hidden="true" />
    <IconError v-else class="alert-icon" color="currentColor" />
    <div class="alert-body">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { QuestionMarkCircleIcon } from "@heroicons/vue/outline";

import IconError from "@/components/icons/IconError.vue";

import type { PropType } from "vue";

defineProps({
  type: {
    type: String as PropType<"warning" | "error" | "notification">,
    default: "warning",
  },
});
</script>

<style lang="scss" scoped>
.alert-container {
  @apply flex items-center rounded-lg p-4;

  .info-tooltip-icon,
  .alert-icon {
    @apply h-5 w-5 shrink-0;
    color: var(--text-muted);
  }

  &.warning {
    background-color: var(--warning-muted);
    color: var(--warning-text);

    .alert-icon {
      color: var(--warning);
    }
  }
  &.error {
    background-color: var(--error-muted);
    color: var(--error-text);

    .alert-icon {
      color: var(--error);
    }
  }

  &.notification {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .alert-body {
    @apply ml-3 w-full;
  }
}
</style>
