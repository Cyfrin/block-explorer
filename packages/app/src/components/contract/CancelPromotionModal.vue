<template>
  <Popup :opened="isOpen">
    <div class="cancel-promotion-content">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">{{ t("cancelPromotion.title") }}</h2>
        <button type="button" class="close-button" @click="$emit('close')">
          <XIcon class="close-icon" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <!-- Confirmation state -->
        <template v-if="!txHash">
          <div class="info-banner">
            <InformationCircleIcon class="info-icon" />
            <div class="info-text">
              <p class="info-title">{{ t("cancelPromotion.infoTitle") }}</p>
              <p class="info-description">{{ t("cancelPromotion.infoDescription") }}</p>
            </div>
          </div>

          <!-- Error message -->
          <div v-if="error" class="error-banner">
            <ExclamationCircleIcon class="error-icon" />
            <span class="error-text">{{ error }}</span>
            <button type="button" class="retry-button" @click="handleReset">
              {{ t("common.tryAgain") }}
            </button>
          </div>
        </template>

        <!-- Success state -->
        <template v-else>
          <div class="success-banner">
            <CheckCircleIcon class="success-icon" />
            <div class="success-text">
              <p class="success-title">{{ t("cancelPromotion.successTitle") }}</p>
              <p class="success-description">{{ t("cancelPromotion.successDescription") }}</p>
            </div>
          </div>
          <a :href="txLink" target="_blank" class="tx-link">
            {{ t("cancelPromotion.viewTransaction") }}
            <ExternalLinkIcon class="external-icon" />
          </a>
        </template>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <template v-if="!txHash">
          <button type="button" class="btn-secondary" :disabled="isProcessing" @click="$emit('close')">
            {{ t("common.cancel") }}
          </button>
          <button type="button" class="btn-primary" :disabled="isProcessing" @click="handleConfirm">
            <span v-if="isProcessing" class="loading-spinner" />
            {{ isProcessing ? t("common.processing") : t("cancelPromotion.confirmButton") }}
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

import { InformationCircleIcon } from "@heroicons/vue/outline";
import { CheckCircleIcon, ExclamationCircleIcon, ExternalLinkIcon, XIcon } from "@heroicons/vue/solid";

import Popup from "@/components/common/Popup.vue";

import useCancelPromotion from "@/composables/useCancelPromotion";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  agreementAddress: {
    type: String,
    required: true,
  },
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "success"): void;
}>();

const { t } = useI18n();

const { isProcessing, error, txHash, cancelPromotion, reset } = useCancelPromotion();

const txLink = computed(() => {
  if (!txHash.value) return "";
  return `/tx/${txHash.value}`;
});

const handleConfirm = async () => {
  await cancelPromotion(props.agreementAddress);
};

const handleReset = () => {
  reset();
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
</script>

<style lang="scss" scoped>
.cancel-promotion-content {
  @apply w-full max-w-md;
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
  @apply rounded-md p-1 transition-colors;
  color: var(--text-muted);

  &:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }
}

.close-icon {
  @apply h-5 w-5;
}

.modal-content {
  @apply space-y-4 px-4 py-4 sm:px-6;
}

.info-banner {
  @apply flex gap-3 rounded-lg border p-4;
  border-color: var(--info-border, var(--border-default));
  background-color: var(--info-bg, var(--bg-secondary));
}

.info-icon {
  @apply h-5 w-5 shrink-0;
  color: var(--info, #3b82f6);
}

.info-text {
  @apply flex flex-col gap-1;
}

.info-title {
  @apply text-sm font-semibold;
  color: var(--info-text, var(--text-primary));
}

.info-description {
  @apply text-sm leading-relaxed;
  color: var(--text-secondary);
}

.error-banner {
  @apply flex flex-wrap items-center gap-2 rounded-lg border p-3;
  border-color: var(--error-border);
  background-color: var(--error-bg);
}

.error-icon {
  @apply h-5 w-5 shrink-0;
  color: var(--error);
}

.error-text {
  @apply flex-1 text-sm;
  color: var(--error-text);
}

.retry-button {
  @apply text-sm font-medium underline;
  color: var(--error-text);

  &:hover {
    text-decoration: none;
  }
}

.success-banner {
  @apply flex gap-3 rounded-lg border p-4;
  border-color: var(--success-border, var(--border-default));
  background-color: var(--success-bg, var(--bg-secondary));
}

.success-icon {
  @apply h-5 w-5 shrink-0;
  color: var(--success);
}

.success-text {
  @apply flex flex-col gap-1;
}

.success-title {
  @apply text-sm font-semibold;
  color: var(--success-text, var(--text-primary));
}

.success-description {
  @apply text-sm leading-relaxed;
  color: var(--text-secondary);
}

.tx-link {
  @apply inline-flex items-center gap-1 text-sm font-medium;
  color: var(--accent);

  &:hover {
    @apply underline;
  }
}

.external-icon {
  @apply h-4 w-4;
}

.modal-footer {
  @apply flex justify-end gap-3 border-t px-4 py-3 sm:px-6;
  border-color: var(--border-default);
}

.btn-secondary {
  @apply rounded-md border px-4 py-2 text-sm font-medium transition-colors;
  border-color: var(--border-default);
  background-color: transparent;
  color: var(--text-secondary);

  &:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &:disabled {
    @apply cursor-not-allowed opacity-50;
  }
}

.btn-primary {
  @apply flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors;
  background-color: var(--accent);
  color: white;

  &:hover:not(:disabled) {
    background-color: var(--accent-hover);
  }

  &:disabled {
    @apply cursor-not-allowed opacity-50;
  }
}

.loading-spinner {
  @apply h-4 w-4 animate-spin rounded-full border-2;
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}
</style>
