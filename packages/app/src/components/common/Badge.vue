<template>
  <Tooltip :disabled="!tooltip">
    <span
      class="badge"
      :class="[`badge-${color}`, `badge-${size}`, { 'badge-with-dot': showDot }]"
      :data-testid="$testId.badge"
    >
      <span v-if="showDot" class="badge-dot" />
      <span v-if="$slots.icon" class="badge-icon">
        <slot name="icon" />
      </span>
      <span v-if="$slots.default" class="badge-text">
        <slot />
      </span>
    </span>
    <template #content>
      {{ tooltip }}
    </template>
  </Tooltip>
</template>

<script setup lang="ts">
import Tooltip from "@/components/common/Tooltip.vue";

import type { PropType } from "vue";

defineProps({
  size: {
    type: String as PropType<"sm" | "md">,
    default: "sm",
  },
  color: {
    type: String as PropType<"neutral" | "success" | "warning" | "error" | "accent">,
    default: "neutral",
  },
  tooltip: {
    type: String,
  },
  showDot: {
    type: Boolean,
    default: false,
  },
});
</script>

<style lang="scss" scoped>
.badge {
  @apply inline-flex items-center gap-1 font-sans font-medium rounded whitespace-nowrap;

  // Sizes
  &.badge-sm {
    @apply h-5 px-2 text-xs;
  }

  &.badge-md {
    @apply h-6 px-2 text-sm;
  }

  // Colors
  &.badge-neutral {
    background-color: var(--neutral-muted);
    color: var(--neutral-text);

    .badge-dot {
      background-color: var(--text-muted);
    }
  }

  &.badge-success {
    background-color: var(--success-muted);
    color: var(--success-text);

    .badge-dot {
      background-color: var(--success);
    }
  }

  &.badge-warning {
    background-color: var(--warning-muted);
    color: var(--warning-text);

    .badge-dot {
      background-color: var(--warning);
    }
  }

  &.badge-error {
    background-color: var(--error-muted);
    color: var(--error-text);

    .badge-dot {
      background-color: var(--error);
    }
  }

  &.badge-accent {
    background-color: var(--accent-muted);
    color: var(--accent-text);

    .badge-dot {
      background-color: var(--accent);
    }
  }
}

.badge-dot {
  @apply w-1.5 h-1.5 rounded-full flex-shrink-0;
}

.badge-icon {
  @apply flex items-center justify-center w-3.5 h-3.5 flex-shrink-0;

  svg {
    @apply w-full h-full;
  }
}

.badge-text {
  @apply leading-none;
}
</style>
