<template>
  <div class="contract-not-registered">
    <div class="not-registered-header">
      <div class="icon-wrapper">
        <ExclamationCircleIcon class="icon" />
      </div>
      <span class="title">Not Registered</span>
    </div>
    <p class="description">
      This contract is not registered in the AttackRegistry. Unregistered contracts may be registered at any time and
      could request to enter the "under attack" state, which may temporarily restrict certain operations.
    </p>
    <p class="warning">Consider this when deciding whether to interact with or deposit funds into this contract.</p>
  </div>
</template>

<script lang="ts" setup>
import { ExclamationCircleIcon } from "@heroicons/vue/outline";
</script>

<style scoped lang="scss">
.contract-not-registered {
  @apply flex flex-col gap-2 rounded-lg border p-4;
  border-color: var(--warning-border, var(--border-default));
  background-color: var(--warning-bg, var(--bg-secondary));

  .not-registered-header {
    @apply flex items-center gap-2;
  }

  .icon-wrapper {
    @apply flex-shrink-0;
  }

  .icon {
    @apply h-5 w-5;
    color: var(--warning, #f59e0b);
  }

  .title {
    @apply text-sm font-semibold;
    color: var(--warning-text, var(--text-primary));
  }

  .description {
    @apply text-sm leading-relaxed;
    color: var(--text-secondary);
  }

  .warning {
    @apply text-xs italic;
    color: var(--text-muted);
  }
}
</style>
