<template>
  <div class="contract-state-timeline">
    <!-- Registered Step -->
    <div class="timeline-step" :class="getStepClass(ContractState.REGISTERED)">
      <div class="step-indicator-column">
        <div class="step-indicator-wrapper">
          <span v-if="isCurrent(ContractState.REGISTERED)" class="ping-animation"></span>
          <div class="step-indicator">
            <CubeIcon v-if="isCurrentOrCompleted(ContractState.REGISTERED)" class="step-icon" />
            <CubeIconOutline v-else class="step-icon" />
          </div>
        </div>
        <div class="timeline-connector-wrapper">
          <div class="timeline-connector" :class="connectorClassAfterRegistered"></div>
        </div>
      </div>
      <div class="step-content">
        <span class="step-label">Registered</span>
        <CopyButton v-if="registeredAtISO" :value="formattedRegisteredAt!" class="step-timestamp">
          <TimeField :value="registeredAtISO" :format="TimeFormat.TIME_AGO" />
        </CopyButton>
        <Tooltip v-if="isCurrent(ContractState.REGISTERED) && hasCountdown" :interactive="true" max-width="350px">
          <span class="step-countdown">
            <CopyButton :value="formattedPromotionTimestamp!">
              <span class="countdown-time">{{ countdownTimeAgo }}</span>
            </CopyButton>
            <span>until production</span>
          </span>
          <template #content>
            <div class="promotion-tooltip">
              If no attack is registered before {{ formattedPromotionTimestamp }}, this contract will automatically be
              promoted to production.
            </div>
          </template>
        </Tooltip>
      </div>
    </div>

    <!-- Under Attack Step (optional) -->
    <div
      v-if="showUnderAttackStep"
      class="timeline-step under-attack"
      :class="getStepClass(ContractState.UNDER_ATTACK)"
    >
      <div class="step-indicator-column">
        <div class="step-indicator-wrapper">
          <span v-if="isCurrent(ContractState.UNDER_ATTACK)" class="ping-animation"></span>
          <div class="step-indicator">
            <ShieldExclamationIcon v-if="isCurrentOrCompleted(ContractState.UNDER_ATTACK)" class="step-icon" />
            <ShieldExclamationIconOutline v-else class="step-icon" />
          </div>
        </div>
        <div class="timeline-connector-wrapper">
          <div class="timeline-connector" :class="connectorClassAfterUnderAttack"></div>
        </div>
      </div>
      <div class="step-content">
        <span class="step-label">Under Attack</span>
        <CopyButton v-if="underAttackAtISO" :value="formattedUnderAttackAt!" class="step-timestamp">
          <TimeField :value="underAttackAtISO" :format="TimeFormat.TIME_AGO" />
        </CopyButton>
        <span v-if="isCurrent(ContractState.UNDER_ATTACK) && hasCountdown" class="step-countdown">
          <CopyButton :value="formattedPromotionTimestamp!">
            <span class="countdown-time">{{ countdownTimeAgo }}</span>
          </CopyButton>
          <span>until production</span>
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

    <!-- Production Step -->
    <div class="timeline-step" :class="getStepClass(ContractState.PRODUCTION)">
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
        <span class="step-label">Production</span>
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
  CubeIcon as CubeIconOutline,
  LockClosedIcon,
  ShieldExclamationIcon as ShieldExclamationIconOutline,
} from "@heroicons/vue/outline";
import { BadgeCheckIcon, CubeIcon, ShieldExclamationIcon } from "@heroicons/vue/solid";
import { useTimeAgo } from "@vueuse/core";

import CopyButton from "@/components/common/CopyButton.vue";
import Tooltip from "@/components/common/Tooltip.vue";
import TimeField from "@/components/common/table/fields/TimeField.vue";

import type { PropType } from "vue";

import { ContractState, TimeFormat } from "@/types";
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
  commitmentLockedUntil: {
    type: Number,
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

const formattedRegisteredAt = computed(() => formatTimestamp(props.registeredAt));
const formattedUnderAttackAt = computed(() => formatTimestamp(props.underAttackAt));
const formattedProductionAt = computed(() => formatTimestamp(props.productionAt));

const registeredAtISO = computed(() => toISOString(props.registeredAt));
const underAttackAtISO = computed(() => toISOString(props.underAttackAt));
const productionAtISO = computed(() => toISOString(props.productionAt));

const promotionTimestamp = computed(() => {
  if (props.state === ContractState.PRODUCTION) return null;
  if (props.state === ContractState.REGISTERED && props.registeredAt) {
    // Auto-promotion is 7 days from registration (this would come from backend in real impl)
    return props.registeredAt + 7 * 24 * 60 * 60 * 1000;
  }
  if (props.state === ContractState.UNDER_ATTACK && props.underAttackAt) {
    // Production promotion is 7 days from under attack (this would come from backend in real impl)
    return props.underAttackAt + 7 * 24 * 60 * 60 * 1000;
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
  if (props.state !== ContractState.UNDER_ATTACK) return false;
  if (!props.commitmentLockedUntil) return false;
  return props.commitmentLockedUntil > Date.now();
});

const showUnderAttackStep = computed(() => {
  return props.state === ContractState.UNDER_ATTACK || props.wasUnderAttack;
});

const connectorClassAfterRegistered = computed(() => {
  // Completed if we're past REGISTERED
  return {
    completed: props.state === ContractState.UNDER_ATTACK || props.state === ContractState.PRODUCTION,
  };
});

const connectorClassAfterUnderAttack = computed(() => {
  // Completed if we're in PRODUCTION
  return {
    completed: props.state === ContractState.PRODUCTION,
  };
});

const isCurrent = (step: ContractState) => props.state === step;

const isCurrentOrCompleted = (step: ContractState) => isCurrent(step) || isCompleted(step);

const isCompleted = (step: ContractState) => {
  if (step === ContractState.REGISTERED) {
    return props.state !== ContractState.REGISTERED;
  }
  if (step === ContractState.UNDER_ATTACK) {
    return props.state === ContractState.PRODUCTION && props.wasUnderAttack;
  }
  if (step === ContractState.PRODUCTION) {
    return props.state === ContractState.PRODUCTION;
  }
  return false;
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
  }

  .step-icon {
    @apply h-4 w-4;
  }

  .step-content {
    @apply flex flex-col pb-4 pt-[0.25rem];
  }

  .step-label {
    @apply text-sm font-medium;
    color: var(--text-muted);
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
