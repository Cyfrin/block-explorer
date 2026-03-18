<template>
  <div class="agreement-summary-badge" :class="badgeClass">
    <div class="badge-icon">
      <ClockIcon v-if="(isPendingApproval || isPromotionPending) && hasAgreement" class="icon" />
      <ExclamationCircleIcon v-else-if="isCorrupted && hasAgreement" class="icon" />
      <ShieldCheckIcon v-else-if="hasAgreement" class="icon" />
      <ShieldExclamationIcon v-else class="icon" />
    </div>
    <div class="badge-content">
      <template v-if="hasAgreement && agreement">
        <div class="badge-title-row">
          <span class="badge-title">{{ agreement.protocolName }}</span>
          <Badge v-if="isPendingApproval" color="warning" size="sm">{{ t("safeHarbor.badges.pending") }}</Badge>
          <Badge v-else-if="isUnderAttack" color="success" size="sm">{{ t("safeHarbor.badges.active") }}</Badge>
          <Badge v-else-if="isPromotionPending" color="neutral" size="sm">{{
            t("safeHarbor.badges.promotionPending")
          }}</Badge>
          <Badge v-else-if="isProduction" color="accent" size="sm">{{ t("safeHarbor.badges.production") }}</Badge>
          <Badge v-else-if="isCorrupted" color="error" size="sm">{{ t("safeHarbor.badges.corrupted") }}</Badge>
        </div>
        <div class="badge-details">
          <span class="detail-item">
            <span class="detail-label">{{ t("safeHarbor.bounty") }}:</span>
            <span class="detail-value">{{ agreement.bountyPercentage }}%</span>
          </span>
          <span class="detail-item">
            <span class="detail-label">{{ t("safeHarbor.cap") }}:</span>
            <span class="detail-value">{{ formattedBountyCap }}</span>
          </span>
          <Tooltip class="identity-tooltip">
            <span class="detail-item identity-requirement">
              {{ identityRequirementLabel }}
            </span>
            <template #content>{{ identityRequirementTooltip }}</template>
          </Tooltip>
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

import { ClockIcon } from "@heroicons/vue/outline";
import { ChevronRightIcon, ExclamationCircleIcon, ShieldCheckIcon, ShieldExclamationIcon } from "@heroicons/vue/solid";

import Badge from "@/components/common/Badge.vue";
import Tooltip from "@/components/common/Tooltip.vue";

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
  contractState: {
    type: String as PropType<string | null>,
    default: null,
  },
});

// State detection computed properties
const isPendingApproval = computed(() => props.contractState === "ATTACK_REQUESTED");
const isUnderAttack = computed(() => props.contractState === "UNDER_ATTACK");
const isPromotionPending = computed(() => props.contractState === "PROMOTION_REQUESTED");
const isProduction = computed(() => props.contractState === "PRODUCTION");
const isCorrupted = computed(() => props.contractState === "CORRUPTED");

const badgeClass = computed(() => ({
  "has-agreement": props.hasAgreement && !isPendingApproval.value && !isCorrupted.value && !isProduction.value,
  "pending-approval": props.hasAgreement && isPendingApproval.value,
  "state-corrupted": props.hasAgreement && isCorrupted.value,
  "state-production": props.hasAgreement && isProduction.value,
  "no-agreement": !props.hasAgreement,
}));

const formattedBountyCap = computed(() => {
  if (!props.agreement) return "";
  // bountyCapUsd is now stored as a string (could be large number)
  const cap = Number(props.agreement.bountyCapUsd ?? 0);
  return cap.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
});

// Identity requirement label for display
const identityRequirementLabel = computed(() => {
  if (!props.agreement) return "";
  switch (props.agreement.identityRequirement) {
    case "Named":
      return t("safeHarbor.identityNamed");
    case "Pseudonymous":
      return t("safeHarbor.identityPseudonymous");
    case "Anonymous":
    default:
      return t("safeHarbor.anonymousAllowed");
  }
});

// Identity requirement tooltip for explanation
const identityRequirementTooltip = computed(() => {
  if (!props.agreement) return "";
  switch (props.agreement.identityRequirement) {
    case "Named":
      return t("safeHarbor.identityNamedTooltip");
    case "Pseudonymous":
      return t("safeHarbor.identityPseudonymousTooltip");
    case "Anonymous":
    default:
      return t("safeHarbor.anonymousAllowedTooltip");
  }
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

  &.pending-approval {
    background-color: var(--warning-muted);

    .badge-icon .icon {
      color: var(--warning);
    }

    .badge-title {
      color: var(--warning-text);
    }
  }

  &.state-corrupted {
    background-color: var(--error-muted);

    .badge-icon .icon {
      color: var(--error);
    }

    .badge-title {
      color: var(--error-text);
    }
  }

  &.state-production {
    background-color: var(--accent-muted);

    .badge-icon .icon {
      color: var(--accent);
    }

    .badge-title {
      color: var(--accent-text);
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

  .badge-title-row {
    @apply flex items-center gap-2;
  }

  .badge-title {
    @apply text-sm font-medium;
  }

  .badge-details {
    @apply flex flex-col gap-0.5 text-xs;
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

  .identity-tooltip {
    width: fit-content;
  }

  .identity-requirement {
    cursor: help;
    border-bottom: 1px dotted currentColor;
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
