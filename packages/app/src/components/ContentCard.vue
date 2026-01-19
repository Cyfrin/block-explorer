<template>
  <component :is="tag" class="content-container">
    <slot />
  </component>
</template>

<script lang="ts" setup>
defineProps({
  tag: {
    type: String,
    default: "div",
  },
});
</script>

<style lang="scss">
.content-container {
  @apply mt-4 grid w-full grid-flow-row grid-cols-1 gap-4 rounded-lg p-4;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-md);

  .content-title {
    @apply text-2xl;
    color: var(--text-primary);
  }
}
</style>
