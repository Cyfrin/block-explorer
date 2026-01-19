<template>
  <div class="badge-container" :class="[`color-${setBadgeColor(memoryDirection, defaultColor)}`]">
    <div class="badge-content">
      {{ text }}
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps({
  text: {
    type: String,
    default: "",
  },
  memoryDirection: {
    type: String,
    default: "",
  },
  defaultColor: {
    type: String,
    default: "neutral",
  },
});

function setBadgeColor(item: string, defaultColor: string) {
  return (item === "Write" && "warning") || (item === "Read" && "primary") || defaultColor;
}
</script>

<style scoped lang="scss">
.badge-container {
  @apply flex w-full max-w-max items-center rounded px-2 py-1 pr-2.5 font-bold capitalize;

  .badge-content {
    @apply block break-all;
  }
  &.color-primary {
    @apply bg-primary-400 text-white;

    .badge-dot {
      @apply bg-primary-500;
    }
  }
  &.color-neutral {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);

    .badge-dot {
      background-color: var(--text-secondary);
    }
  }
  &.color-warning {
    @apply bg-warning-400 text-white;

    .badge-dot {
      @apply bg-warning-600;
    }
  }
  &.color-transparent {
    @apply pl-0;
    color: var(--text-secondary);

    .badge-dot {
      color: var(--text-secondary);
    }
  }
}
</style>
