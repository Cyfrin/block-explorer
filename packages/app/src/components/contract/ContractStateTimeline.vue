<template>
  <div class="contract-state-timeline">
    <!-- New Deployment Step -->
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
          <div class="timeline-connector" :class="connectorClassAfterNewDeployment"></div>
        </div>
      </div>
      <div class="step-content">
        <span class="step-label">New Deployment</span>
        <CopyButton v-if="deployedAtISO" :value="formattedDeployedAt!" class="step-timestamp">
          <TimeField :value="deployedAtISO" :format="TimeFormat.TIME_AGO" />
        </CopyButton>
        <Tooltip v-if="isCurrent(ContractState.NEW_DEPLOYMENT) && hasCountdown" :interactive="true" max-width="350px">
          <span class="step-countdown">
            <CopyButton :value="formattedPromotionTimestamp!">
              <span class="countdown-time">{{ countdownTimeAgo }}</span>
            </CopyButton>
            <span>until production</span>
          </span>
          <template #content>
            <div class="promotion-tooltip">
              If no attackable phase is registered before {{ formattedPromotionTimestamp }}, this contract will
              automatically be promoted to production.
            </div>
          </template>
        </Tooltip>
      </div>
    </div>

    <!-- Attackable Step (optional) -->
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
          <div class="timeline-connector" :class="connectorClassAfterAttackable"></div>
        </div>
      </div>
      <div class="step-content">
        <span class="step-label">Attackable</span>
        <CopyButton v-if="attackableAtISO" :value="formattedAttackableAt!" class="step-timestamp">
          <TimeField :value="attackableAtISO" :format="TimeFormat.TIME_AGO" />
        </CopyButton>
        <span v-if="isCurrent(ContractState.UNDER_ATTACK) && hasCountdown" class="step-countdown">
          <CopyButton :value="formattedPromotionTimestamp!">
            <span class="countdown-time">{{ countdownTimeAgo }}</span>
          </CopyButton>
          <span>until production</span>
        </span>
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
  ShieldExclamationIcon as ShieldExclamationIconOutline,
} from "@heroicons/vue/outline";
import { BadgeCheckIcon, CubeIcon, ShieldExclamationIcon } from "@heroicons/vue/solid";
import { useTimeAgo } from "@vueuse/core";

import CopyButton from "@/components/common/CopyButton.vue";
import Tooltip from "@/components/common/Tooltip.vue";
import TimeField from "@/components/common/table/fields/TimeField.vue";

import type { PropType } from "vue";

import { TimeFormat } from "@/types";
import { ISOStringFromUnixTimestamp, localDateFromUnixTimestamp } from "@/utils/helpers";

const { t } = useI18n();

enum ContractState {
  NEW_DEPLOYMENT = "NEW_DEPLOYMENT",
  UNDER_ATTACK = "UNDER_ATTACK",
  PRODUCTION = "PRODUCTION",
}

const props = defineProps({
  state: {
    type: String as PropType<ContractState>,
    required: true,
  },
  wasUnderAttack: {
    type: Boolean,
    default: false,
  },
  deployedAt: {
    type: Number,
    default: null,
  },
  attackableAt: {
    type: Number,
    default: null,
  },
  productionAt: {
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

const formattedDeployedAt = computed(() => formatTimestamp(props.deployedAt));
const formattedAttackableAt = computed(() => formatTimestamp(props.attackableAt));
const formattedProductionAt = computed(() => formatTimestamp(props.productionAt));

const deployedAtISO = computed(() => toISOString(props.deployedAt));
const attackableAtISO = computed(() => toISOString(props.attackableAt));
const productionAtISO = computed(() => toISOString(props.productionAt));

const promotionTimestamp = computed(() => {
  if (props.state === ContractState.PRODUCTION) return null;
  if (props.state === ContractState.NEW_DEPLOYMENT && props.deployedAt) {
    // Auto-promotion is 7 days from deployment (this would come from backend in real impl)
    return props.deployedAt + 7 * 24 * 60 * 60 * 1000;
  }
  if (props.state === ContractState.UNDER_ATTACK && props.attackableAt) {
    // Production promotion is 7 days from attackable (this would come from backend in real impl)
    return props.attackableAt + 7 * 24 * 60 * 60 * 1000;
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

const showUnderAttackStep = computed(() => {
  return props.state === ContractState.UNDER_ATTACK || props.wasUnderAttack;
});

const connectorClassAfterNewDeployment = computed(() => {
  // Completed if we're past NEW_DEPLOYMENT
  return {
    completed: props.state === ContractState.UNDER_ATTACK || props.state === ContractState.PRODUCTION,
  };
});

const connectorClassAfterAttackable = computed(() => {
  // Completed if we're in PRODUCTION
  return {
    completed: props.state === ContractState.PRODUCTION,
  };
});

const isCurrent = (step: ContractState) => props.state === step;

const isCurrentOrCompleted = (step: ContractState) => isCurrent(step) || isCompleted(step);

const isCompleted = (step: ContractState) => {
  if (step === ContractState.NEW_DEPLOYMENT) {
    return props.state !== ContractState.NEW_DEPLOYMENT;
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
    @apply absolute inset-0 h-7 w-7 rounded-full bg-primary-400;
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
    @apply relative flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-500;
  }

  .timeline-connector-wrapper {
    @apply flex-1 flex justify-center min-h-[0.5rem];
  }

  .timeline-connector {
    @apply h-full w-0.5 bg-neutral-300;

    &.completed {
      @apply bg-success-500;
    }
  }

  .step-icon {
    @apply h-4 w-4;
  }

  .step-content {
    @apply flex flex-col pb-4 pt-[0.25rem];
  }

  .step-label {
    @apply text-sm font-medium text-neutral-500;
  }

  :deep(.step-timestamp.copy-button-container) {
    @apply h-auto w-auto text-xs text-neutral-400;

    .copy-button {
      @apply static p-0 focus:ring-0;
    }

    .info-field-time {
      @apply cursor-pointer hover:text-neutral-600 hover:underline;
    }
  }

  .step-countdown {
    @apply flex items-center gap-1 text-xs text-neutral-400;

    :deep(.copy-button-container) {
      @apply h-auto w-auto;
    }

    :deep(.copy-button) {
      @apply static p-0 focus:ring-0;
    }

    .countdown-time {
      @apply cursor-pointer hover:text-neutral-600 hover:underline;
    }
  }

  &.future {
    @apply opacity-50;
  }

  &.current {
    .step-indicator {
      @apply bg-primary-500 text-white;
    }
    .step-label {
      @apply text-primary-600;
    }
  }

  &.current.under-attack {
    .ping-animation {
      @apply bg-error-400;
    }
    .step-indicator {
      @apply bg-error-500 text-white;
    }
    .step-label {
      @apply text-error-600;
    }
  }

  &.completed {
    .step-indicator {
      @apply bg-success-500 text-white;
    }
    .step-label {
      @apply text-success-600;
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
</style>
