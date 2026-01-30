<template>
  <div class="contract-state-timeline">
    <!-- Registered Step (NEW_DEPLOYMENT) -->
    <div class="timeline-step" :class="getStepClass(ContractState.NEW_DEPLOYMENT)">
      <div class="step-indicator-column">
        <div class="step-indicator-wrapper">
          <span v-if="isCurrent(ContractState.NEW_DEPLOYMENT)" class="ping-animation"></span>
          <div class="step-indicator">
            <CubeIcon v-if="isCurrentOrCompleted(ContractState.NEW_DEPLOYMENT)" class="step-icon" />
            <CubeIconOutline v-else class="step-icon" />
          </div>
        </div>
        <div class="timeline-connector-wrapper">
          <div class="timeline-connector" :class="connectorClassAfterRegistered"></div>
        </div>
      </div>
      <div class="step-content">
        <span class="step-label">{{ t("contractState.registered") }}</span>
        <CopyButton v-if="registeredAtISO" :value="formattedRegisteredAt!" class="step-timestamp">
          <TimeField :value="registeredAtISO" :format="TimeFormat.TIME_AGO" />
        </CopyButton>
        <Tooltip v-if="isCurrent(ContractState.NEW_DEPLOYMENT) && hasCountdown" :interactive="true" max-width="350px">
          <span class="step-countdown">
            <CopyButton :value="formattedPromotionTimestamp!">
              <span class="countdown-time">{{ countdownTimeAgo }}</span>
            </CopyButton>
            <span>{{ t("contractState.untilProduction") }}</span>
          </span>
          <template #content>
            <div class="promotion-tooltip">
              {{ t("contractState.autoPromotionTooltip", { date: formattedPromotionTimestamp }) }}
            </div>
          </template>
        </Tooltip>
      </div>
    </div>

    <!-- Warming Up Step (ATTACK_REQUESTED) -->
    <div
      v-if="showAttackRequestedStep"
      class="timeline-step attack-requested"
      :class="getStepClass(ContractState.ATTACK_REQUESTED)"
    >
      <div class="step-indicator-column">
        <div class="step-indicator-wrapper">
          <span v-if="isCurrent(ContractState.ATTACK_REQUESTED)" class="ping-animation"></span>
          <div class="step-indicator">
            <ClockIcon v-if="isCurrentOrCompleted(ContractState.ATTACK_REQUESTED)" class="step-icon" />
            <ClockIconOutline v-else class="step-icon" />
          </div>
        </div>
        <div class="timeline-connector-wrapper">
          <div class="timeline-connector dashed" :class="connectorClassAfterAttackRequested"></div>
        </div>
      </div>
      <div class="step-content">
        <span class="step-label">{{ t("contractState.warmingUp") }}</span>
        <span class="step-subtitle">{{ t("contractState.warmingUpSubtitle") }}</span>
      </div>
    </div>

    <!-- Attackable Step (UNDER_ATTACK or PROMOTION_REQUESTED - both are still attackable) -->
    <div v-if="showUnderAttackStep" class="timeline-step under-attack" :class="getAttackableStepClass()">
      <div class="step-indicator-column">
        <div class="step-indicator-wrapper">
          <span v-if="isCurrentlyAttackable" class="ping-animation"></span>
          <div class="step-indicator">
            <ShieldExclamationIcon v-if="isCurrentOrCompletedAttackable" class="step-icon" />
            <ShieldExclamationIconOutline v-else class="step-icon" />
          </div>
        </div>
        <div class="timeline-connector-wrapper">
          <div class="timeline-connector" :class="connectorClassAfterUnderAttack"></div>
        </div>
      </div>
      <div class="step-content">
        <div class="step-label-row">
          <span class="step-label">{{ t("contractState.attackable") }}</span>
          <span v-if="isPromotionPending" class="promotion-pending-badge">
            {{ t("contractState.promotionPending") }}
          </span>
        </div>
        <span v-if="isCurrentlyAttackable && !isPromotionPending" class="step-subtitle">{{
          t("contractState.attackableSubtitle")
        }}</span>
        <CopyButton v-if="underAttackAtISO" :value="formattedUnderAttackAt!" class="step-timestamp">
          <TimeField :value="underAttackAtISO" :format="TimeFormat.TIME_AGO" />
        </CopyButton>
        <span v-if="isCurrentlyAttackable && hasCountdown" class="step-countdown">
          <CopyButton :value="formattedPromotionTimestamp!">
            <span class="countdown-time">{{ countdownTimeAgo }}</span>
          </CopyButton>
          <span>{{ t("contractState.untilProduction") }}</span>
        </span>
        <Tooltip v-if="showCommitmentLock" :interactive="true" max-width="350px">
          <span class="commitment-lock">
            <LockClosedIcon class="lock-icon" />
            <span>{{ t("contractState.termsUnlock") }}</span>
            <CopyButton :value="formattedCommitmentLockedUntil!">
              <span class="lock-time">{{ commitmentLockTimeAgo }}</span>
            </CopyButton>
          </span>
          <template #content>
            <div class="commitment-tooltip">
              {{ t("contractState.termsLockedTooltip") }}
            </div>
          </template>
        </Tooltip>
      </div>
    </div>

    <!-- Compromised Step (CORRUPTED) - Terminal state, shown instead of Production when corrupted -->
    <div
      v-if="showCorruptedStep"
      class="timeline-step corrupted terminal"
      :class="getStepClass(ContractState.CORRUPTED)"
    >
      <div class="step-indicator-column">
        <div class="step-indicator-wrapper">
          <div class="step-indicator">
            <ExclamationCircleIcon class="step-icon" />
          </div>
        </div>
        <!-- No connector - terminal state -->
      </div>
      <div class="step-content">
        <span class="step-label">{{ t("contractState.compromised") }}</span>
        <span class="step-subtitle">{{ t("contractState.compromisedSubtitle") }}</span>
        <CopyButton v-if="corruptedAtISO" :value="formattedCorruptedAt!" class="step-timestamp">
          <TimeField :value="corruptedAtISO" :format="TimeFormat.TIME_AGO" />
        </CopyButton>
        <!-- Attack details if available -->
        <div v-if="attackDetails" class="attack-details">
          <span v-if="attackDetails.attackerAddress" class="attack-detail">
            {{ t("contractState.attackerAddress") }}: {{ truncateAddress(attackDetails.attackerAddress) }}
          </span>
          <span v-if="attackDetails.attackType" class="attack-detail">
            {{ t("contractState.attackType") }}: {{ attackDetails.attackType }}
          </span>
        </div>
      </div>
    </div>

    <!-- Production Step - Only shown if not corrupted -->
    <div v-if="!showCorruptedStep" class="timeline-step" :class="getStepClass(ContractState.PRODUCTION)">
      <div class="step-indicator-column">
        <div class="step-indicator-wrapper">
          <div class="step-indicator">
            <BadgeCheckIcon v-if="isCurrentOrCompleted(ContractState.PRODUCTION)" class="step-icon" />
            <BadgeCheckIconOutline v-else class="step-icon" />
          </div>
        </div>
        <!-- No connector after the last step -->
      </div>
      <div class="step-content">
        <span class="step-label">{{ t("contractState.production") }}</span>
        <CopyButton v-if="productionAtISO" :value="formattedProductionAt!" class="step-timestamp">
          <TimeField :value="productionAtISO" :format="TimeFormat.TIME_AGO" />
        </CopyButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import {
  BadgeCheckIcon as BadgeCheckIconOutline,
  ClockIcon as ClockIconOutline,
  CubeIcon as CubeIconOutline,
  ExclamationCircleIcon,
  LockClosedIcon,
  ShieldExclamationIcon as ShieldExclamationIconOutline,
} from "@heroicons/vue/outline";
import { BadgeCheckIcon, ClockIcon, CubeIcon, ShieldExclamationIcon } from "@heroicons/vue/solid";
import { useTimeAgo } from "@vueuse/core";

import CopyButton from "@/components/common/CopyButton.vue";
import Tooltip from "@/components/common/Tooltip.vue";
import TimeField from "@/components/common/table/fields/TimeField.vue";

import type { Address } from "@/types";
import type { PropType } from "vue";

import { ContractState, TimeFormat } from "@/types";
import { PROMOTION_DELAY_MS, PROMOTION_WINDOW_MS } from "@/utils/battlechain.constants";
import { ISOStringFromUnixTimestamp, localDateFromUnixTimestamp } from "@/utils/helpers";

const { t } = useI18n();

const props = defineProps({
  state: {
    type: String as PropType<ContractState>,
    required: true,
  },
  wasUnderAttack: {
    type: Boolean,
    default: false,
  },
  registeredAt: {
    type: Number,
    default: null,
  },
  underAttackAt: {
    type: Number,
    default: null,
  },
  productionAt: {
    type: Number,
    default: null,
  },
  promotionRequestedAt: {
    type: Number,
    default: null,
  },
  corruptedAt: {
    type: Number,
    default: null,
  },
  promotionWindowEnds: {
    type: Number,
    default: null,
  },
  commitmentLockedUntil: {
    type: Number,
    default: null,
  },
  attackDetails: {
    type: Object as PropType<{
      attackerAddress?: Address;
      attackRegisteredAt?: number;
      attackType?: string;
    } | null>,
    default: null,
  },
});

const formatTimestamp = (timestamp: number | null): string | null => {
  if (!timestamp) return null;
  return localDateFromUnixTimestamp(Math.floor(timestamp / 1000));
};

const toISOString = (timestamp: number | null): string => {
  if (!timestamp) return "";
  return ISOStringFromUnixTimestamp(Math.floor(timestamp / 1000));
};

const truncateAddress = (address: string): string => {
  if (address.length <= 13) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formattedRegisteredAt = computed(() => formatTimestamp(props.registeredAt));
const formattedUnderAttackAt = computed(() => formatTimestamp(props.underAttackAt));
const formattedProductionAt = computed(() => formatTimestamp(props.productionAt));
const formattedCorruptedAt = computed(() => formatTimestamp(props.corruptedAt));

const registeredAtISO = computed(() => toISOString(props.registeredAt));
const underAttackAtISO = computed(() => toISOString(props.underAttackAt));
const productionAtISO = computed(() => toISOString(props.productionAt));
const corruptedAtISO = computed(() => toISOString(props.corruptedAt));

// Use backend-calculated promotion window end, or calculate fallback
const promotionTimestamp = computed(() => {
  // Terminal states have no countdown
  if (props.state === ContractState.PRODUCTION || props.state === ContractState.CORRUPTED) return null;

  // Prefer backend-calculated value
  if (props.promotionWindowEnds) return props.promotionWindowEnds;

  // Fallback calculations using constants
  if (props.state === ContractState.NEW_DEPLOYMENT && props.registeredAt) {
    return props.registeredAt + PROMOTION_WINDOW_MS;
  }
  if (props.state === ContractState.ATTACK_REQUESTED && props.registeredAt) {
    return props.registeredAt + PROMOTION_WINDOW_MS;
  }
  if (props.state === ContractState.UNDER_ATTACK && props.registeredAt) {
    return props.registeredAt + PROMOTION_WINDOW_MS;
  }
  if (props.state === ContractState.PROMOTION_REQUESTED && props.promotionRequestedAt) {
    return props.promotionRequestedAt + PROMOTION_DELAY_MS;
  }
  return null;
});

const promotionTimestampISO = computed(() => toISOString(promotionTimestamp.value));
const formattedPromotionTimestamp = computed(() => formatTimestamp(promotionTimestamp.value));

// Custom messages for countdown without "in" prefix
const countdownMessages = {
  justNow: t("timeMessages.justNow"),
  past: (n: string) => n,
  future: (n: string) => n, // No "in" prefix
  month: (n: number, past: boolean) =>
    n === 1
      ? past
        ? t("timeMessages.lastMonth")
        : t("timeMessages.nextMonth")
      : `${n} ${n > 1 ? t("timeMessages.monthPlural") : t("timeMessages.month")}`,
  year: (n: number, past: boolean) =>
    n === 1
      ? past
        ? t("timeMessages.lastYear")
        : t("timeMessages.nextYear")
      : `${n} ${n > 1 ? t("timeMessages.yearPlural") : t("timeMessages.year")}`,
  day: (n: number, past: boolean) =>
    n === 1
      ? past
        ? t("timeMessages.yesterday")
        : t("timeMessages.tomorrow")
      : `${n} ${n > 1 ? t("timeMessages.dayPlural") : t("timeMessages.day")}`,
  week: (n: number, past: boolean) =>
    n === 1
      ? past
        ? t("timeMessages.lastWeek")
        : t("timeMessages.nextWeek")
      : `${n} ${n > 1 ? t("timeMessages.weekPlural") : t("timeMessages.week")}`,
  hour: (n: number) => `${n} ${n > 1 ? t("timeMessages.hourPlural") : t("timeMessages.hour")}`,
  minute: (n: number) => `${n} ${n > 1 ? t("timeMessages.minutePlural") : t("timeMessages.minute")}`,
  second: (n: number) => `${n} ${n > 1 ? t("timeMessages.secondPlural") : t("timeMessages.second")}`,
};

const countdownTimeAgo = useTimeAgo(promotionTimestampISO, { messages: countdownMessages });

const hasCountdown = computed(() => {
  if (!promotionTimestamp.value) return false;
  return promotionTimestamp.value - Date.now() > 0;
});

// Show commitment lock message if in UNDER_ATTACK state and lock period hasn't expired
const commitmentLockedUntilISO = computed(() => toISOString(props.commitmentLockedUntil));
const formattedCommitmentLockedUntil = computed(() => formatTimestamp(props.commitmentLockedUntil));

const commitmentLockTimeAgo = useTimeAgo(commitmentLockedUntilISO, { messages: countdownMessages });

const showCommitmentLock = computed(() => {
  // Show commitment lock in both UNDER_ATTACK and PROMOTION_REQUESTED (both are still attackable)
  if (props.state !== ContractState.UNDER_ATTACK && props.state !== ContractState.PROMOTION_REQUESTED) return false;
  if (!props.commitmentLockedUntil) return false;
  return props.commitmentLockedUntil > Date.now();
});

// Visibility conditions for optional steps
// Show warming up step ONLY when currently in that state - it's ephemeral and disappears once passed
const showAttackRequestedStep = computed(() => {
  return props.state === ContractState.ATTACK_REQUESTED;
});

// Show attackable step if currently attackable (including promotion requested), past it, was ever under attack,
// or in ATTACK_REQUESTED state (to show what warming up leads to)
const showUnderAttackStep = computed(() => {
  return (
    props.state === ContractState.ATTACK_REQUESTED ||
    props.state === ContractState.UNDER_ATTACK ||
    props.state === ContractState.PROMOTION_REQUESTED ||
    props.state === ContractState.CORRUPTED ||
    props.wasUnderAttack
  );
});

// PROMOTION_REQUESTED is still attackable, so it's shown as a variant of the Attackable step
const isCurrentlyAttackable = computed(() => {
  return props.state === ContractState.UNDER_ATTACK || props.state === ContractState.PROMOTION_REQUESTED;
});

const isPromotionPending = computed(() => {
  return props.state === ContractState.PROMOTION_REQUESTED;
});

const isCurrentOrCompletedAttackable = computed(() => {
  return (
    props.state === ContractState.UNDER_ATTACK ||
    props.state === ContractState.PROMOTION_REQUESTED ||
    props.state === ContractState.PRODUCTION ||
    props.state === ContractState.CORRUPTED ||
    props.wasUnderAttack
  );
});

const getAttackableStepClass = () => {
  const isCurrent = isCurrentlyAttackable.value;
  const isCompleted = props.state === ContractState.PRODUCTION || props.state === ContractState.CORRUPTED;
  // Future if we're in ATTACK_REQUESTED (warming up) or not yet at attackable phase
  const isFuture =
    props.state === ContractState.ATTACK_REQUESTED || (!isCurrent && !isCompleted && !props.wasUnderAttack);

  return {
    current: isCurrent,
    completed: isCompleted || (props.wasUnderAttack && !isCurrent),
    future: isFuture,
    "promotion-pending": isPromotionPending.value,
  };
};

const showCorruptedStep = computed(() => {
  return props.state === ContractState.CORRUPTED;
});

// Connector classes
const connectorClassAfterRegistered = computed(() => {
  const isAttackRequested = props.state === ContractState.ATTACK_REQUESTED;
  const isPastRegistered =
    props.state === ContractState.UNDER_ATTACK ||
    props.state === ContractState.PROMOTION_REQUESTED ||
    props.state === ContractState.PRODUCTION ||
    props.state === ContractState.CORRUPTED ||
    props.state === ContractState.ATTACK_REQUESTED;
  return {
    completed: isPastRegistered,
    dashed: isAttackRequested,
  };
});

const connectorClassAfterAttackRequested = computed(() => {
  const isPastAttackRequested =
    props.state === ContractState.UNDER_ATTACK ||
    props.state === ContractState.PROMOTION_REQUESTED ||
    props.state === ContractState.PRODUCTION ||
    props.state === ContractState.CORRUPTED;
  return {
    completed: isPastAttackRequested,
  };
});

const connectorClassAfterUnderAttack = computed(() => {
  // Connector is completed when we've moved past the attackable phase entirely
  const isPastAttackable = props.state === ContractState.PRODUCTION || props.state === ContractState.CORRUPTED;
  return {
    completed: isPastAttackable,
  };
});

const isCurrent = (step: ContractState) => props.state === step;

const isCurrentOrCompleted = (step: ContractState) => isCurrent(step) || isCompleted(step);

const isCompleted = (step: ContractState) => {
  // PROMOTION_REQUESTED is now shown as part of UNDER_ATTACK step, not separate
  const stateOrder = [
    ContractState.NEW_DEPLOYMENT,
    ContractState.ATTACK_REQUESTED,
    ContractState.UNDER_ATTACK,
    ContractState.PRODUCTION,
  ];

  const currentIndex = stateOrder.indexOf(props.state as ContractState);
  const stepIndex = stateOrder.indexOf(step);

  // Special handling for CORRUPTED - it branches from the attackable phase
  if (props.state === ContractState.CORRUPTED) {
    if (step === ContractState.NEW_DEPLOYMENT) return true;
    if (step === ContractState.ATTACK_REQUESTED) return true;
    if (step === ContractState.UNDER_ATTACK) return true;
    if (step === ContractState.CORRUPTED) return true;
    return false;
  }

  // PROMOTION_REQUESTED is still in the attackable phase
  if (props.state === ContractState.PROMOTION_REQUESTED) {
    if (step === ContractState.NEW_DEPLOYMENT) return true;
    if (step === ContractState.ATTACK_REQUESTED) return true;
    // UNDER_ATTACK is "current" when in PROMOTION_REQUESTED (still attackable)
    return false;
  }

  // ATTACK_REQUESTED is never truly "completed" in the traditional sense
  // but we mark it completed if we've moved past it
  if (step === ContractState.ATTACK_REQUESTED) {
    return (
      props.state === ContractState.UNDER_ATTACK ||
      props.state === ContractState.PROMOTION_REQUESTED ||
      props.state === ContractState.PRODUCTION
    );
  }

  if (currentIndex === -1 || stepIndex === -1) return false;
  return stepIndex < currentIndex;
};

const isFuture = (step: ContractState) => !isCurrent(step) && !isCompleted(step);

const getStepClass = (step: ContractState) => {
  return {
    current: isCurrent(step),
    completed: isCompleted(step),
    future: isFuture(step),
  };
};
</script>

<style scoped lang="scss">
.contract-state-timeline {
  @apply flex flex-col;
}

.timeline-step {
  @apply flex items-stretch gap-2;

  .step-indicator-column {
    @apply flex flex-col items-center flex-shrink-0;
  }

  .step-indicator-wrapper {
    @apply relative flex-shrink-0;
  }

  .ping-animation {
    @apply absolute inset-0 h-7 w-7 rounded-full;
    background-color: var(--accent);
    opacity: 0.6;
    animation: subtle-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
  }

  @keyframes subtle-ping {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }
    75%,
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }

  .step-indicator {
    @apply relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold;
    background-color: var(--bg-tertiary);
    color: var(--text-muted);
  }

  .timeline-connector-wrapper {
    @apply flex-1 flex justify-center min-h-[0.5rem];
  }

  .timeline-connector {
    @apply h-full w-0.5;
    background-color: var(--border-strong);

    &.completed {
      background-color: var(--success);
    }

    &.dashed {
      background: none;
      border-left: 2px dashed var(--border-strong);
      width: 0;

      &.completed {
        border-color: var(--success);
      }
    }
  }

  .step-icon {
    @apply h-4 w-4;
  }

  .step-content {
    @apply flex flex-col pb-4 pt-[0.25rem];
  }

  .step-label-row {
    @apply flex items-center gap-2;
  }

  .step-label {
    @apply text-sm font-medium;
    color: var(--text-muted);
  }

  .promotion-pending-badge {
    @apply rounded px-1.5 py-0.5 text-xs font-medium;
    background-color: var(--accent-muted);
    color: var(--accent-text);
  }

  .step-subtitle {
    @apply text-xs;
    color: var(--text-faint);
  }

  :deep(.step-timestamp.copy-button-container) {
    @apply h-auto w-auto text-xs;
    color: var(--text-faint);

    .copy-button {
      @apply static p-0 focus:ring-0;
    }

    .info-field-time {
      @apply cursor-pointer hover:underline;
      &:hover {
        color: var(--text-secondary);
      }
    }
  }

  .step-countdown {
    @apply flex items-center gap-1 text-xs;
    color: var(--text-faint);

    :deep(.copy-button-container) {
      @apply h-auto w-auto;
    }

    :deep(.copy-button) {
      @apply static p-0 focus:ring-0;
    }

    .countdown-time {
      @apply cursor-pointer hover:underline;
      &:hover {
        color: var(--text-secondary);
      }
    }
  }

  .commitment-lock {
    @apply mt-1 flex items-center gap-1 text-xs;
    color: var(--warning-text);

    .lock-icon {
      @apply h-3.5 w-3.5;
      color: var(--warning);
    }

    :deep(.copy-button-container) {
      @apply h-auto w-auto;
    }

    :deep(.copy-button) {
      @apply static p-0 focus:ring-0;
    }

    .lock-time {
      @apply cursor-pointer font-medium hover:underline;
    }
  }

  .attack-details {
    @apply mt-1 flex flex-col gap-0.5;

    .attack-detail {
      @apply text-xs;
      color: var(--error-text);
    }
  }

  &.future {
    @apply opacity-50;
  }

  &.current {
    .step-indicator {
      background-color: var(--accent);
      color: white;
    }
    .step-label {
      color: var(--accent-text);
    }
  }

  &.current.under-attack {
    .ping-animation {
      background-color: var(--error);
    }
    .step-indicator {
      background-color: var(--error);
      color: white;
    }
    .step-label {
      color: var(--error-text);
    }
  }

  &.current.attack-requested {
    .ping-animation {
      background-color: var(--warning);
    }
    .step-indicator {
      background-color: var(--warning);
      color: white;
    }
    .step-label {
      color: var(--warning-text);
    }
  }

  // When promotion is pending, the contract is still attackable but with a different visual treatment
  &.current.under-attack.promotion-pending {
    .ping-animation {
      background-color: var(--accent);
    }
    .step-indicator {
      background-color: var(--accent);
      color: white;
    }
    .step-label {
      color: var(--accent-text);
    }
  }

  &.corrupted,
  &.current.corrupted {
    .step-indicator {
      background-color: var(--error);
      color: white;
    }
    .step-label {
      color: var(--error-text);
    }
  }

  &.terminal {
    .step-indicator {
      @apply ring-2 ring-offset-2;
      --tw-ring-color: var(--error-muted);
      --tw-ring-offset-color: var(--bg-primary);
    }
  }

  &.completed {
    .step-indicator {
      background-color: var(--success);
      color: white;
    }
    .step-label {
      color: var(--success-text);
    }
  }

  // Last step shouldn't have bottom padding
  &:last-child .step-content {
    @apply pb-0;
  }
}
</style>

<style lang="scss">
.promotion-tooltip {
  @apply w-72;
}

.commitment-tooltip {
  @apply w-72;
}
</style>
