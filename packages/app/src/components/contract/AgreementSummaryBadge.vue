<template>
  <div class="agreement-summary-badge" :class="{ 'has-agreement': hasAgreement, 'no-agreement': !hasAgreement }">
    <div class="badge-icon">
      <ShieldCheckIcon v-if="hasAgreement" class="icon" />
      <ShieldExclamationIcon v-else class="icon" />
    </div>
    <div class="badge-content">
      <template v-if="hasAgreement && agreement">
        <span class="badge-title">{{ agreement.protocolName }}</span>
        <div class="badge-details">
          <span class="detail-item">
            <span class="detail-label">{{ t("safeHarbor.bounty") }}:</span>
            <span class="detail-value">{{ agreement.bountyPercentage }}%</span>
          </span>
          <span class="detail-separator">|</span>
          <span class="detail-item">
            <span class="detail-label">{{ t("safeHarbor.cap") }}:</span>
            <span class="detail-value">{{ formattedBountyCap }}</span>
          </span>
          <span v-if="agreement.allowAnonymous" class="detail-separator">|</span>
          <span v-if="agreement.allowAnonymous" class="detail-item anonymous-allowed">
            {{ t("safeHarbor.anonymousAllowed") }}
          </span>
        </div>
      </template>
      <template v-else>
        <span class="badge-title">{{ t("safeHarbor.noAgreement") }}</span>
        <div class="badge-details">
          <span class="detail-item">
            <span class="detail-value default-terms">{{ t("safeHarbor.defaultTermsApply") }}</span>
          </span>
        </div>
      </template>
    </div>
    <router-link v-if="linkToTab" :to="{ hash: '#safe-harbor' }" class="view-details-link">
      {{ t("safeHarbor.viewDetails") }}
      <ChevronRightIcon class="chevron-icon" />
    </router-link>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { ChevronRightIcon, ShieldCheckIcon, ShieldExclamationIcon } from "@heroicons/vue/solid";

import type { SafeHarborAgreement } from "@/types";
import type { PropType } from "vue";

const { t } = useI18n();

const props = defineProps({
  agreement: {
    type: Object as PropType<SafeHarborAgreement | null>,
    default: null,
  },
  hasAgreement: {
    type: Boolean,
    default: false,
  },
  linkToTab: {
    type: Boolean,
    default: true,
  },
});

const formattedBountyCap = computed(() => {
  if (!props.agreement) return "";
  // Assuming USDC with 6 decimals
  const cap = Number(props.agreement.bountyCap) / 1e6;
  if (cap >= 1_000_000) {
    return `$${(cap / 1_000_000).toFixed(0)}M`;
  } else if (cap >= 1_000) {
    return `$${(cap / 1_000).toFixed(0)}K`;
  }
  return `$${cap.toFixed(0)}`;
});
</script>

<style scoped lang="scss">
.agreement-summary-badge {
  @apply flex flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-center sm:gap-3;

  &.has-agreement {
    @apply bg-success-50;

    .badge-icon .icon {
      @apply text-success-500;
    }

    .badge-title {
      @apply text-success-700;
    }
  }

  &.no-agreement {
    @apply bg-warning-50;

    .badge-icon .icon {
      @apply text-warning-500;
    }

    .badge-title {
      @apply text-warning-700;
    }

    .default-terms {
      @apply text-warning-600;
    }
  }

  .badge-icon {
    @apply hidden flex-shrink-0 sm:block;

    .icon {
      @apply h-6 w-6;
    }
  }

  .badge-content {
    @apply flex min-w-0 flex-1 flex-col gap-0.5;
  }

  .badge-title {
    @apply text-sm font-medium;
  }

  .badge-details {
    @apply flex flex-wrap items-center gap-1.5 text-xs text-neutral-500;
  }

  .detail-item {
    @apply flex items-center gap-1;
  }

  .detail-label {
    @apply text-neutral-400;
  }

  .detail-value {
    @apply font-medium text-neutral-600;
  }

  .detail-separator {
    @apply hidden text-neutral-300 sm:inline;
  }

  .anonymous-allowed {
    @apply text-success-600;
  }

  .view-details-link {
    @apply flex flex-shrink-0 items-center gap-0.5 self-start text-xs font-medium text-primary-600 hover:text-primary-700 sm:self-center;

    .chevron-icon {
      @apply h-4 w-4;
    }
  }
}
</style>
