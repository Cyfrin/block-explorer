<template>
  <Badge v-if="text" :color="badgeColor" class="direction-badge">
    {{ text }}
  </Badge>
</template>

<script setup lang="ts">
import { computed } from "vue";

import Badge from "@/components/common/Badge.vue";

import type { PropType } from "vue";

export type Direction = "in" | "out" | "self";

const props = defineProps({
  text: {
    type: String as PropType<Direction>,
    required: true,
  },
});

const badgeColor = computed(() => {
  switch (props.text) {
    case "in":
      return "success";
    case "out":
      return "warning";
    case "self":
      return "accent";
    default:
      return "neutral";
  }
});
</script>

<style lang="scss" scoped>
.direction-badge {
  @apply w-8 justify-center uppercase;
}
</style>
