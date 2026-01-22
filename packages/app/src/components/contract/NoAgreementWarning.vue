<template>
  <div class="no-agreement-warning">
    <ShieldExclamationIcon class="warning-icon" />
    <p class="warning-message">{{ t("safeHarbor.noAgreementSimple") }}</p>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";

import { ShieldExclamationIcon } from "@heroicons/vue/outline";

const { t } = useI18n();
</script>

<style scoped lang="scss">
.no-agreement-warning {
  @apply flex items-center gap-2 rounded-lg border p-4;
  border-color: var(--warning-border, var(--border-default));
  background-color: var(--warning-bg, var(--bg-secondary));

  .warning-icon {
    @apply h-5 w-5 shrink-0;
    color: var(--warning, #f59e0b);
  }

  .warning-message {
    @apply text-sm;
    color: var(--text-secondary);
  }
}
</style>
