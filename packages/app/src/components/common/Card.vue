<template>
  <div class="card" :class="[`card-${variant}`, `card-padding-${padding}`]">
    <div v-if="$slots.header || title" class="card-header">
      <slot name="header">
        <h3 v-if="title" class="card-title">{{ title }}</h3>
        <p v-if="subtitle" class="card-subtitle">{{ subtitle }}</p>
      </slot>
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from "vue";

defineProps({
  variant: {
    type: String as PropType<"default" | "bordered" | "elevated">,
    default: "bordered",
  },
  padding: {
    type: String as PropType<"none" | "sm" | "md" | "lg">,
    default: "md",
  },
  title: {
    type: String,
  },
  subtitle: {
    type: String,
  },
});
</script>

<style lang="scss" scoped>
.card {
  @apply w-full overflow-hidden rounded-lg;
  background-color: var(--bg-primary);

  // Variants
  &.card-default {
    // No border, just background
  }

  &.card-bordered {
    border: 1px solid var(--border-default);
  }

  &.card-elevated {
    border: 1px solid var(--border-default);
    box-shadow: var(--shadow-sm);
  }

  // Padding variants
  &.card-padding-none {
    .card-body {
      @apply p-0;
    }
  }

  &.card-padding-sm {
    .card-body {
      @apply p-3;
    }
    .card-header {
      @apply p-3;
    }
    .card-footer {
      @apply p-3;
    }
  }

  &.card-padding-md {
    .card-body {
      @apply p-4;
    }
    .card-header {
      @apply p-4;
    }
    .card-footer {
      @apply p-4;
    }
  }

  &.card-padding-lg {
    .card-body {
      @apply p-6;
    }
    .card-header {
      @apply p-6;
    }
    .card-footer {
      @apply p-6;
    }
  }
}

.card-header {
  border-bottom: 1px solid var(--border-subtle);
}

.card-title {
  @apply text-lg font-semibold m-0;
  color: var(--text-primary);
}

.card-subtitle {
  @apply text-sm mt-1 mb-0 ml-0 mr-0;
  color: var(--text-muted);
}

.card-body {
  // Body content
}

.card-footer {
  border-top: 1px solid var(--border-subtle);
  background-color: var(--bg-secondary);
}
</style>
