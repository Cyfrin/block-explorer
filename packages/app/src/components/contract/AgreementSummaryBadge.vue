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
          <span v-if="allowsAnonymous" class="detail-separator">|</span>
          <span v-if="allowsAnonymous" class="detail-item anonymous-allowed">
            {{ t("safeHarbor.anonymousAllowed") }}
          </span>
        </div>
      </template>
      <template v-else>
        <span class="badge-title">{{ t("safeHarbor.noAgreement") }}</span>
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
  // bountyCapUsd is now stored as a string (could be large number)
  const cap = Number(props.agreement.bountyCapUsd ?? 0);
  return cap.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
});

// Anonymous whitehats are allowed if identityRequirement is "Anonymous" or not set
const allowsAnonymous = computed(() => {
  if (!props.agreement) return false;
  return props.agreement.identityRequirement === "Anonymous" || props.agreement.identityRequirement === undefined;
});
</script>

<style scoped lang="scss">
.agreement-summary-badge {
  @apply flex flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-center sm:gap-3;

  &.has-agreement {
    background-color: var(--success-muted);

    .badge-icon .icon {
      color: var(--success);
    }

    .badge-title {
      color: var(--success-text);
    }
  }

  &.no-agreement {
    background-color: var(--warning-muted);

    .badge-icon .icon {
      color: var(--warning);
    }

    .badge-title {
      color: var(--warning-text);
    }
  }

  .badge-icon {
    @apply hidden shrink-0 sm:block;

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
    @apply flex flex-wrap items-center gap-1.5 text-xs;
    color: var(--text-muted);
  }

  .detail-item {
    @apply flex items-center gap-1;
  }

  .detail-label {
    color: var(--text-muted);
  }

  .detail-value {
    @apply font-medium;
    color: var(--text-secondary);
  }

  .detail-separator {
    @apply hidden sm:inline;
    color: var(--text-faint);
  }

  .anonymous-allowed {
    color: var(--success-text);
  }

  .view-details-link {
    @apply flex shrink-0 items-center gap-0.5 self-start text-xs font-medium sm:self-center;
    color: var(--accent);

    &:hover {
      color: var(--accent-hover);
    }

    .chevron-icon {
      @apply h-4 w-4;
    }
  }
}
</style>
