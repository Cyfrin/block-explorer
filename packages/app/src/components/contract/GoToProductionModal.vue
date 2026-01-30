<template>
  <Popup :opened="isOpen">
    <div class="go-to-production-modal">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">{{ t("goToProduction.title") }}</h2>
        <button type="button" class="close-button" @click="handleClose">
          <XIcon class="close-icon" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Confirmation state -->
        <template v-if="!txHash">
          <div class="warning-banner">
            <ExclamationIcon class="warning-icon" />
            <div class="warning-text">
              <p class="warning-title">{{ t("goToProduction.warningTitle") }}</p>
              <p class="warning-description">{{ t("goToProduction.warningDescription") }}</p>
            </div>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span class="info-label">{{ t("goToProduction.contractLabel") }}</span>
              <span class="info-value">{{ shortValue(contractAddress) }}</span>
            </div>
          </div>

          <p class="confirmation-text">{{ t("goToProduction.confirmationText") }}</p>

          <!-- Error Message -->
          <div v-if="error" class="error-message">
            <ExclamationCircleIcon class="error-icon" />
            <span>{{ error }}</span>
            <button type="button" class="retry-link" @click="reset">
              {{ t("common.tryAgain") }}
            </button>
          </div>
        </template>

        <!-- Success state -->
        <template v-else>
          <div class="success-banner">
            <CheckCircleIcon class="success-icon" />
            <div class="success-text">
              <p class="success-title">{{ t("goToProduction.successTitle") }}</p>
              <p class="success-description">{{ t("goToProduction.successDescription") }}</p>
            </div>
          </div>
          <a :href="txLink" target="_blank" class="tx-link">
            {{ t("goToProduction.viewTransaction") }}
            <ExternalLinkIcon class="external-icon" />
          </a>
        </template>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <template v-if="!txHash">
          <button type="button" class="btn-secondary" :disabled="isProcessing" @click="handleClose">
            {{ t("common.cancel") }}
          </button>
          <button type="button" class="btn-danger" :disabled="isProcessing" @click="handleConfirm">
            <span v-if="isProcessing" class="loading-spinner" />
            {{ isProcessing ? t("common.processing") : t("goToProduction.confirmButton") }}
          </button>
        </template>
        <template v-else>
          <button type="button" class="btn-primary" @click="handleSuccess">
            {{ t("common.done") }}
          </button>
        </template>
      </div>
    </div>
  </Popup>
</template>

<script lang="ts" setup>
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";

import { ExclamationIcon } from "@heroicons/vue/outline";
import { CheckCircleIcon, ExclamationCircleIcon, ExternalLinkIcon, XIcon } from "@heroicons/vue/solid";

import Popup from "@/components/common/Popup.vue";

import useGoToProduction from "@/composables/useGoToProduction";

import { shortValue } from "@/utils/formatters";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  contractAddress: {
    type: String,
    required: true,
  },
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "success"): void;
}>();

const { t } = useI18n();

const { isProcessing, error, txHash, goToProduction, reset } = useGoToProduction();

const txLink = computed(() => {
  if (!txHash.value) return "";
  return `/tx/${txHash.value}`;
});

const handleClose = () => {
  emit("close");
};

const handleConfirm = async () => {
  await goToProduction(props.contractAddress);
};

const handleSuccess = () => {
  emit("success");
};

// Reset state when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      reset();
    }
  }
);

// Expose reset for external use
defineExpose({ reset });
</script>

<style scoped lang="scss">
.go-to-production-modal {
  @apply w-full max-w-md rounded-lg shadow-xl;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);
}

.modal-header {
  @apply flex items-center justify-between border-b px-4 py-3 sm:px-6;
  border-color: var(--border-default);
}

.modal-title {
  @apply text-lg font-semibold;
  color: var(--text-primary);
}

.close-button {
  @apply rounded p-1;
  color: var(--text-muted);

  &:hover {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
  }
}

.close-icon {
  @apply h-5 w-5;
}

.modal-content {
  @apply space-y-4 px-4 py-4 sm:px-6;
}

.warning-banner {
  @apply flex gap-3 rounded-lg border p-4;
  border-color: var(--warning-border, #fbbf24);
  background-color: var(--warning-bg, #fef3c7);
}

.warning-icon {
  @apply h-6 w-6 shrink-0;
  color: var(--warning, #f59e0b);
}

.warning-text {
  @apply flex flex-col gap-1;
}

.warning-title {
  @apply text-sm font-semibold;
  color: var(--warning-text, #92400e);
}

.warning-description {
  @apply text-sm;
  color: var(--text-secondary);
}

.info-section {
  @apply rounded-lg border p-3;
  border-color: var(--border-default);
  background-color: var(--bg-secondary);
}

.info-row {
  @apply flex items-center justify-between;
}

.info-label {
  @apply text-sm;
  color: var(--text-muted);
}

.info-value {
  @apply font-mono text-sm;
  color: var(--text-primary);
}

.confirmation-text {
  @apply text-sm;
  color: var(--text-secondary);
}

.error-message {
  @apply flex items-center gap-2 rounded-lg border p-3;
  border-color: var(--error-border, #fca5a5);
  background-color: var(--error-bg, #fee2e2);
  color: var(--error, #ef4444);
}

.error-icon {
  @apply h-5 w-5 shrink-0;
}

.retry-link {
  @apply ml-auto text-sm font-medium underline;
  color: var(--accent);

  &:hover {
    color: var(--accent-hover);
  }
}

.success-banner {
  @apply flex gap-3 rounded-lg border p-4;
  border-color: var(--success-border, #86efac);
  background-color: var(--success-bg, #dcfce7);
}

.success-icon {
  @apply h-6 w-6 shrink-0;
  color: var(--success, #10b981);
}

.success-text {
  @apply flex flex-col gap-1;
}

.success-title {
  @apply text-sm font-semibold;
  color: var(--success-text, #166534);
}

.success-description {
  @apply text-sm;
  color: var(--text-secondary);
}

.tx-link {
  @apply flex items-center justify-center gap-1 text-sm font-medium;
  color: var(--accent);

  &:hover {
    color: var(--accent-hover);
  }
}

.external-icon {
  @apply h-4 w-4;
}

.modal-footer {
  @apply flex justify-end gap-3 border-t px-4 py-3 sm:px-6;
  border-color: var(--border-default);
}

.btn-secondary,
.btn-danger,
.btn-primary {
  @apply flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors;

  &:disabled {
    @apply cursor-not-allowed opacity-50;
  }
}

.btn-secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);

  &:hover:not(:disabled) {
    background-color: var(--bg-quaternary);
  }
}

.btn-danger {
  background-color: var(--error, #ef4444);
  color: white;

  &:hover:not(:disabled) {
    background-color: var(--error-hover, #dc2626);
  }
}

.btn-primary {
  background-color: var(--accent);
  color: white;

  &:hover:not(:disabled) {
    background-color: var(--accent-hover);
  }
}

.loading-spinner {
  @apply h-4 w-4 animate-spin rounded-full border-2;
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}
</style>
