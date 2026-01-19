<template>
  <div class="commitment-window-status" :class="{ locked: isLocked, unlocked: !isLocked }">
    <div class="status-icon">
      <LockClosedIcon v-if="isLocked" class="icon" />
      <LockOpenIcon v-else class="icon" />
    </div>
    <div class="status-content">
      <span class="status-label">
        {{ isLocked ? t("safeHarbor.termsLocked") : t("safeHarbor.termsUnlocked") }}
      </span>
      <template v-if="isLocked && deadline">
        <span class="status-deadline">
          {{ t("safeHarbor.lockedUntil") }}
          <CopyButton :value="formattedDeadline!" class="deadline-copy">
            <TimeField :value="deadlineISO" :format="TimeFormat.TIME_AGO" />
          </CopyButton>
        </span>
      </template>
      <template v-else-if="!isLocked">
        <span class="status-warning">
          {{ t("safeHarbor.termsCanChange") }}
        </span>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { LockClosedIcon, LockOpenIcon } from "@heroicons/vue/solid";

import CopyButton from "@/components/common/CopyButton.vue";
import TimeField from "@/components/common/table/fields/TimeField.vue";

import { TimeFormat } from "@/types";
import { ISOStringFromUnixTimestamp, localDateFromUnixTimestamp } from "@/utils/helpers";

const { t } = useI18n();

const props = defineProps({
  deadline: {
    type: Number,
    default: null,
  },
});

const isLocked = computed(() => {
  if (!props.deadline) return false;
  return Date.now() < props.deadline;
});

const formattedDeadline = computed(() => {
  if (!props.deadline) return null;
  return localDateFromUnixTimestamp(Math.floor(props.deadline / 1000));
});

const deadlineISO = computed(() => {
  if (!props.deadline) return "";
  return ISOStringFromUnixTimestamp(Math.floor(props.deadline / 1000));
});
</script>

<style scoped lang="scss">
.commitment-window-status {
  @apply flex items-start gap-2 rounded-md px-3 py-2 sm:items-center;

  &.locked {
    background-color: var(--success-muted);

    .status-icon .icon {
      color: var(--success);
    }

    .status-label {
      color: var(--success-text);
    }
  }

  &.unlocked {
    background-color: var(--warning-muted);

    .status-icon .icon {
      color: var(--warning);
    }

    .status-label {
      color: var(--warning-text);
    }

    .status-warning {
      color: var(--warning-text);
    }
  }

  .status-icon {
    @apply flex-shrink-0 pt-0.5 sm:pt-0;

    .icon {
      @apply h-5 w-5;
    }
  }

  .status-content {
    @apply flex min-w-0 flex-col gap-0.5;
  }

  .status-label {
    @apply text-sm font-medium;
  }

  .status-deadline {
    @apply flex flex-wrap items-center gap-1 text-xs;
    color: var(--text-muted);
  }

  :deep(.deadline-copy.copy-button-container) {
    @apply h-auto w-auto;

    .copy-button {
      @apply static p-0 focus:ring-0;
    }

    .info-field-time {
      @apply cursor-pointer hover:underline;
      color: var(--text-secondary);
    }
  }

  .status-warning {
    @apply text-xs;
  }
}
</style>
