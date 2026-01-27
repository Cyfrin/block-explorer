<template>
  <div class="editable-section" :class="{ editing: isEditing }">
    <div class="section-header">
      <h3 class="section-title">{{ title }}</h3>
      <div class="section-actions">
        <template v-if="isEditing">
          <button @click="$emit('save')" :disabled="isSaving || !canSave" class="btn-save">
            <Spinner v-if="isSaving" size="xs" class="spinner" />
            {{ isSaving ? t("common.saving") : t("common.save") }}
          </button>
          <button @click="$emit('cancel')" :disabled="isSaving" class="btn-cancel">
            <XIcon class="icon" />
          </button>
        </template>
        <button v-else-if="canEdit" @click="$emit('edit')" class="btn-edit" :title="t('safeHarbor.edit.editSection')">
          <PencilIcon class="icon" />
        </button>
      </div>
    </div>
    <div class="section-content">
      <slot v-if="!isEditing" />
      <slot v-else name="edit-form" />
    </div>
    <div v-if="error" class="section-error">{{ error }}</div>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";

import { PencilIcon, XIcon } from "@heroicons/vue/solid";

import Spinner from "@/components/common/Spinner.vue";

defineProps({
  title: {
    type: String,
    required: true,
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  canEdit: {
    type: Boolean,
    default: false,
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  canSave: {
    type: Boolean,
    default: true,
  },
  error: {
    type: String,
    default: null,
  },
});

defineEmits<{
  (e: "edit"): void;
  (e: "save"): void;
  (e: "cancel"): void;
}>();

const { t } = useI18n();
</script>

<style scoped lang="scss">
.editable-section {
  @apply rounded-lg border p-3 transition-all duration-200 sm:p-4;
  border-color: var(--border-default);
  background-color: var(--bg-primary);

  &.editing {
    @apply border-dashed;
    border-color: var(--accent);
    background-color: var(--bg-secondary);
  }

  .section-header {
    @apply mb-2 flex items-center justify-between gap-4 border-b pb-2 sm:mb-3;
    border-color: var(--border-subtle);
  }

  .section-title {
    @apply text-sm font-semibold;
    color: var(--text-secondary);
  }

  .section-actions {
    @apply flex items-center gap-2;
  }

  .btn-edit {
    @apply rounded p-1 transition-colors;
    color: var(--text-muted);

    &:hover {
      color: var(--accent);
      background-color: var(--bg-tertiary);
    }

    .icon {
      @apply h-4 w-4;
    }
  }

  .btn-save {
    @apply flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors;
    background-color: var(--accent);
    color: white;

    &:hover:not(:disabled) {
      opacity: 0.9;
    }

    &:disabled {
      @apply cursor-not-allowed opacity-60;
    }

    .spinner {
      @apply h-3 w-3;
    }
  }

  .btn-cancel {
    @apply rounded p-1 transition-colors;
    color: var(--text-muted);

    &:hover:not(:disabled) {
      color: var(--error-text);
      background-color: var(--error-muted);
    }

    &:disabled {
      @apply cursor-not-allowed opacity-60;
    }

    .icon {
      @apply h-4 w-4;
    }
  }

  .section-content {
    :deep(> *:not(:first-child)) {
      @apply mt-2;
    }
  }

  .section-error {
    @apply mt-3 rounded-md px-3 py-2 text-sm;
    background-color: var(--error-muted);
    color: var(--error-text);
  }
}
</style>
