<template>
  <span class="network-badge-wrapper">
    <Badge color="neutral">
      {{ network }}
    </Badge>
  </span>
</template>

<script lang="ts" setup>
import Badge from "@/components/common/Badge.vue";

import type { NetworkOrigin } from "@/types";
import type { PropType } from "vue";

defineProps({
  network: {
    type: String as PropType<NetworkOrigin>,
    required: true,
    default: "L1",
  },
});
</script>

<style scoped lang="scss">
.network-badge-wrapper {
  @apply shrink-0;

  :deep(.badge) {
    @apply w-6 justify-center px-0;
  }
}
</style>
