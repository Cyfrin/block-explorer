<template>
  <div class="no-agreement-warning">
    <div class="warning-header">
      <ShieldExclamationIcon class="warning-icon" />
      <h3 class="warning-title">{{ t("safeHarbor.noAgreementTitle") }}</h3>
    </div>
    <div class="warning-content">
      <p class="warning-message">
        {{ t("safeHarbor.noAgreementMessage") }}
      </p>
      <div class="default-terms">
        <h4 class="default-terms-title">{{ t("safeHarbor.defaultTermsTitle") }}</h4>
        <ul class="default-terms-list">
          <li>
            <span class="term-label">{{ t("safeHarbor.bounty") }}:</span>
            <span class="term-value">{{ defaultTerms.bountyPercentage }}%</span>
          </li>
          <li>
            <span class="term-label">{{ t("safeHarbor.cap") }}:</span>
            <span class="term-value">{{ formattedDefaultCap }}</span>
          </li>
        </ul>
      </div>
      <p class="warning-note">
        {{ t("safeHarbor.defaultTermsNote") }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { ShieldExclamationIcon } from "@heroicons/vue/outline";

import type { PropType } from "vue";

const { t } = useI18n();

const props = defineProps({
  defaultTerms: {
    type: Object as PropType<{ bountyPercentage: number; bountyCap: bigint }>,
    default: () => ({
      bountyPercentage: 10,
      bountyCap: BigInt("5000000000000"),
    }),
  },
});

const formattedDefaultCap = computed(() => {
  const cap = Number(props.defaultTerms.bountyCap) / 1e6;
  if (cap >= 1_000_000) {
    return `$${(cap / 1_000_000).toFixed(0)}M`;
  } else if (cap >= 1_000) {
    return `$${(cap / 1_000).toFixed(0)}K`;
  }
  return `$${cap.toFixed(0)}`;
});
</script>

<style scoped lang="scss">
.no-agreement-warning {
  @apply rounded-lg border border-warning-200 bg-warning-50 p-4;

  .warning-header {
    @apply mb-3 flex items-center gap-2;
  }

  .warning-icon {
    @apply h-6 w-6 text-warning-500;
  }

  .warning-title {
    @apply text-lg font-semibold text-warning-700;
  }

  .warning-content {
    @apply space-y-3;
  }

  .warning-message {
    @apply text-sm text-warning-700;
  }

  .default-terms {
    @apply rounded-md bg-white/50 p-3;
  }

  .default-terms-title {
    @apply mb-2 text-sm font-medium text-neutral-700;
  }

  .default-terms-list {
    @apply space-y-1;

    li {
      @apply flex items-center gap-2 text-sm;
    }
  }

  .term-label {
    @apply text-neutral-500;
  }

  .term-value {
    @apply font-medium text-neutral-700;
  }

  .warning-note {
    @apply text-xs italic text-warning-600;
  }
}
</style>
