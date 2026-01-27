<template>
  <!-- Display mode -->
  <div v-if="!isEditing" class="commitment-window-status" :class="{ locked: isLocked, unlocked: !isLocked }">
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
          {{ t("safeHarbor.termsUnlock") }}
          <CopyButton :value="formattedDeadline!" class="deadline-copy">
            <span class="deadline-time">{{ deadlineTimeAgo }}</span>
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

  <!-- Edit mode -->
  <div v-else class="commitment-window-edit">
    <label class="edit-label">{{ t("safeHarbor.edit.newDeadline") }}</label>
    <input
      v-model="editedDeadline"
      type="datetime-local"
      :min="minDeadline"
      class="deadline-input"
      :class="{ error: validationError }"
      @input="emitUpdate"
    />
    <span v-if="validationError" class="error-text">{{ validationError }}</span>
    <span v-else class="edit-help">{{ t("safeHarbor.edit.extendDeadlineHelp") }}</span>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { LockClosedIcon, LockOpenIcon } from "@heroicons/vue/solid";
import { useTimeAgo } from "@vueuse/core";

import CopyButton from "@/components/common/CopyButton.vue";

import { ISOStringFromUnixTimestamp, localDateFromUnixTimestamp } from "@/utils/helpers";

const { t } = useI18n();

const props = defineProps({
  deadline: {
    type: Number,
    default: null,
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (e: "update:deadline", value: number): void;
}>();

// Local state for editing
const editedDeadline = ref<string>("");

// Convert milliseconds timestamp to datetime-local input format (local time)
const formatForDatetimeInput = (ms: number): string => {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Convert datetime-local input string to milliseconds timestamp
const parseFromDatetimeInput = (value: string): number => {
  return new Date(value).getTime();
};

// Initialize edit value when entering edit mode
watch(
  () => props.isEditing,
  (editing) => {
    if (editing && props.deadline) {
      editedDeadline.value = formatForDatetimeInput(props.deadline);
    }
  },
  { immediate: true }
);

// Computed min value (must be after current deadline)
const minDeadline = computed(() => {
  if (!props.deadline) return "";
  return formatForDatetimeInput(props.deadline);
});

// Validation error message
const validationError = computed(() => {
  if (!editedDeadline.value) return "";

  const newDeadlineMs = parseFromDatetimeInput(editedDeadline.value);

  // Must be after current deadline
  if (props.deadline && newDeadlineMs <= props.deadline) {
    return t("safeHarbor.edit.deadlineMustBeAfterCurrent");
  }

  return "";
});

// Check if form has any errors
const hasErrors = computed(() => {
  return validationError.value !== "" || !editedDeadline.value;
});

// Expose hasErrors for parent component
defineExpose({ hasErrors });

// Emit update when deadline changes
const emitUpdate = () => {
  if (editedDeadline.value) {
    emit("update:deadline", parseFromDatetimeInput(editedDeadline.value));
  }
};

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

const deadlineTimeAgo = useTimeAgo(deadlineISO);
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
  }

  .deadline-time {
    @apply cursor-pointer hover:underline;
    color: var(--text-secondary);
  }

  .status-warning {
    @apply text-xs;
  }
}

.commitment-window-edit {
  @apply flex flex-col gap-2;

  .edit-label {
    @apply text-xs font-medium;
    color: var(--text-muted);
  }

  .deadline-input {
    @apply w-full rounded-md border px-3 py-2 text-sm;
    border-color: var(--border-default);
    background-color: var(--bg-primary);
    color: var(--text-primary);

    &:focus {
      @apply outline-none ring-2;
      ring-color: var(--accent);
      border-color: var(--accent);
    }

    &.error {
      border-color: var(--error);
    }
  }

  .edit-help {
    @apply text-xs;
    color: var(--text-muted);
  }

  .error-text {
    @apply text-xs;
    color: var(--error-text);
  }
}
</style>
