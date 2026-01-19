<template>
  <component
    :is="tag"
    :type="type"
    class="btn"
    :class="[`btn-${variant}`, `btn-${size}`, { 'btn-loading': loading, 'btn-icon-only': iconOnly }]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <span v-if="loading" class="btn-spinner">
      <svg class="animate-spin" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </span>
    <span v-else class="btn-content">
      <slot />
    </span>
  </component>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import type { PropType } from "vue";

export default defineComponent({
  inheritAttrs: false,
  props: {
    tag: {
      type: String,
      default: "button",
    },
    variant: {
      type: String as PropType<"primary" | "secondary" | "ghost" | "danger">,
      default: "primary",
    },
    size: {
      type: String as PropType<"sm" | "md" | "lg">,
      default: "md",
    },
    type: {
      type: String,
      default: "button",
    },
    loading: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    iconOnly: {
      type: Boolean,
      default: false,
    },
  },
});
</script>

<style lang="scss" scoped>
.btn {
  @apply inline-flex items-center justify-center gap-2 font-sans font-medium no-underline whitespace-nowrap rounded-md cursor-pointer;
  transition: all 100ms cubic-bezier(0.25, 1, 0.5, 1);

  &:focus-visible {
    @apply outline-2 outline-offset-2;
    outline-color: var(--accent);
  }

  &:disabled {
    @apply opacity-50 cursor-not-allowed;
  }

  // Sizes
  &.btn-sm {
    @apply h-7 px-2 text-xs;

    &.btn-icon-only {
      @apply w-7 px-0;
    }
  }

  &.btn-md {
    @apply h-9 px-3 text-sm;

    &.btn-icon-only {
      @apply w-9 px-0;
    }
  }

  &.btn-lg {
    @apply h-11 px-4 text-base;

    &.btn-icon-only {
      @apply w-11 px-0;
    }
  }

  // Variants
  &.btn-primary {
    background-color: var(--accent);
    border: 1px solid var(--accent);
    @apply text-white;

    &:hover:not(:disabled) {
      background-color: var(--accent-hover);
      border-color: var(--accent-hover);
    }

    &:active:not(:disabled) {
      transform: scale(0.98);
    }
  }

  &.btn-secondary {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-default);
    color: var(--text-primary);

    &:hover:not(:disabled) {
      background-color: var(--bg-hover);
      border-color: var(--border-strong);
    }

    &:active:not(:disabled) {
      background-color: var(--bg-active);
    }
  }

  &.btn-ghost {
    @apply bg-transparent border border-transparent;
    color: var(--text-secondary);

    &:hover:not(:disabled) {
      background-color: var(--bg-hover);
      color: var(--text-primary);
    }

    &:active:not(:disabled) {
      background-color: var(--bg-active);
    }
  }

  &.btn-danger {
    background-color: var(--error);
    border: 1px solid var(--error);
    @apply text-white;

    &:hover:not(:disabled) {
      background-color: var(--error-text);
      border-color: var(--error-text);
    }
  }

  &.btn-loading {
    @apply pointer-events-none;
  }
}

.btn-spinner {
  @apply flex items-center justify-center;

  svg {
    @apply w-4 h-4;
  }
}

.btn-content {
  @apply inline-flex items-center gap-1;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
