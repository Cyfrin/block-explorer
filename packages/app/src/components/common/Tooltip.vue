<template>
  <Tippy v-bind="$attrs" theme="light" :on-show="() => (disabled ? false : undefined)">
    <template #default>
      <slot />
    </template>
    <template #content>
      <slot name="content" />
    </template>
  </Tippy>
</template>

<script lang="ts" setup>
import { Tippy } from "vue-tippy";

import type { PropType } from "vue";

export type TooltipPosition = "top" | "left" | "right";

defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  position: {
    type: String as PropType<TooltipPosition>,
    default: "top",
  },
});
</script>

<style lang="scss">
.tippy-box {
  @apply rounded-lg text-sm;
  &[data-theme~="light"] {
    background-color: var(--text-muted);
    color: var(--bg-primary);
    &[data-placement^="top"] > .tippy-arrow:before {
      border-top-color: var(--text-muted);
    }
    &[data-placement^="bottom"] > .tippy-arrow:before {
      border-bottom-color: var(--text-muted);
    }
  }
}
</style>
