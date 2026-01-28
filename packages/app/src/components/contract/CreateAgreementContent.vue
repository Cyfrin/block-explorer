<template>
  <div class="create-agreement-modal">
    <!-- Header -->
    <div class="modal-header">
      <h2 class="modal-title">{{ t("safeHarbor.createAgreement.title") }}</h2>
      <button type="button" class="close-button" @click="$emit('close')">
        <XIcon class="icon" />
      </button>
    </div>

    <!-- Step Indicator -->
    <div class="step-indicator">
      <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
        <div class="step-circle">
          <CheckIcon v-if="currentStep > 1" class="check-icon" />
          <span v-else>1</span>
        </div>
        <span class="step-label">{{ t("safeHarbor.createAgreement.step1Label") }}</span>
      </div>
      <div class="step-connector" :class="{ completed: currentStep > 1 }" />
      <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
        <div class="step-circle">
          <CheckIcon v-if="currentStep > 2" class="check-icon" />
          <span v-else>2</span>
        </div>
        <span class="step-label">{{ t("safeHarbor.createAgreement.step2Label") }}</span>
      </div>
    </div>

    <!-- Content -->
    <div class="modal-content">
      <!-- Step 1: Agreement Form -->
      <template v-if="currentStep === 1">
        <form class="agreement-form" @submit.prevent="handleCreateAgreement">
          <FormItem :label="t('safeHarbor.createAgreement.protocolName')" required>
            <Input
              v-model="formData.protocolName"
              :placeholder="t('safeHarbor.createAgreement.protocolNamePlaceholder')"
              :disabled="isCreatingAgreement"
              :error="errors.protocolName"
            />
          </FormItem>

          <div class="form-row">
            <FormItem :label="t('safeHarbor.createAgreement.bountyPercentage')" required>
              <div class="input-with-suffix">
                <Input
                  v-model.number="formData.bountyPercentage"
                  type="number"
                  min="1"
                  max="100"
                  :disabled="isCreatingAgreement"
                  :error="errors.bountyPercentage"
                />
                <span class="suffix">%</span>
              </div>
            </FormItem>
            <FormItem :label="t('safeHarbor.createAgreement.bountyCap')" required>
              <div class="input-with-prefix">
                <span class="prefix">$</span>
                <Input
                  v-model="formData.bountyCap"
                  type="text"
                  :placeholder="t('safeHarbor.createAgreement.bountyCapPlaceholder')"
                  :disabled="isCreatingAgreement"
                  :error="errors.bountyCap"
                />
              </div>
            </FormItem>
          </div>

          <FormItem>
            <label class="checkbox-label">
              <input
                v-model="formData.allowAnonymous"
                type="checkbox"
                class="checkbox"
                :disabled="isCreatingAgreement"
              />
              <span>{{ t("safeHarbor.createAgreement.allowAnonymous") }}</span>
            </label>
          </FormItem>

          <div class="section-divider">
            <span>{{ t("safeHarbor.createAgreement.contactSection") }}<span class="required-indicator">*</span></span>
          </div>

          <FormItem :label="t('safeHarbor.createAgreement.email')">
            <Input
              v-model="formData.contactEmail"
              type="email"
              :placeholder="t('safeHarbor.createAgreement.emailPlaceholder')"
              :disabled="isCreatingAgreement"
              :error="errors.contact"
            />
          </FormItem>

          <div class="form-row">
            <FormItem :label="t('safeHarbor.createAgreement.discord')">
              <Input
                v-model="formData.contactDiscord"
                :placeholder="t('safeHarbor.createAgreement.discordPlaceholder')"
                :disabled="isCreatingAgreement"
              />
            </FormItem>
            <FormItem :label="t('safeHarbor.createAgreement.telegram')">
              <Input
                v-model="formData.contactTelegram"
                :placeholder="t('safeHarbor.createAgreement.telegramPlaceholder')"
                :disabled="isCreatingAgreement"
              />
            </FormItem>
          </div>

          <div class="section-divider">
            <span>{{ t("safeHarbor.createAgreement.additionalSection") }}</span>
          </div>

          <FormItem :label="t('safeHarbor.createAgreement.recoveryAddress')" required>
            <Input
              v-model="formData.assetRecoveryAddress"
              :placeholder="t('safeHarbor.createAgreement.recoveryAddressPlaceholder')"
              :disabled="isCreatingAgreement"
              :error="errors.assetRecoveryAddress"
            />
            <template #underline>
              {{ t("safeHarbor.createAgreement.recoveryAddressHint") }}
            </template>
          </FormItem>

          <FormItem :label="t('safeHarbor.createAgreement.agreementURI')">
            <Input
              v-model="formData.agreementURI"
              :placeholder="t('safeHarbor.createAgreement.agreementURIPlaceholder')"
              :disabled="isCreatingAgreement"
            />
            <template #underline>
              {{ t("safeHarbor.createAgreement.agreementURIHint") }}
            </template>
          </FormItem>

          <!-- Error Message -->
          <div v-if="createAgreementError" class="error-message">
            <ExclamationCircleIcon class="error-icon" />
            <span>{{ createAgreementError }}</span>
          </div>
        </form>
      </template>

      <!-- Step 2: Adopt Agreement -->
      <template v-else-if="currentStep === 2">
        <div class="step2-content">
          <div class="success-banner">
            <CheckCircleIcon class="success-icon" />
            <div class="success-text">
              <p class="success-title">{{ t("safeHarbor.createAgreement.agreementCreated") }}</p>
              <p class="success-address">
                {{ shortValue(agreementAddress!) }}
                <a v-if="createTxHash" :href="txLink(createTxHash)" target="_blank" class="tx-link">
                  {{ t("safeHarbor.createAgreement.viewTransaction") }}
                  <ExternalLinkIcon class="external-icon" />
                </a>
              </p>
            </div>
          </div>

          <p class="step2-description">
            {{ t("safeHarbor.createAgreement.adoptDescription") }}
          </p>

          <!-- Error Message -->
          <div v-if="adoptError" class="error-message">
            <ExclamationCircleIcon class="error-icon" />
            <span>{{ adoptError }}</span>
          </div>
        </div>
      </template>

      <!-- Step 3: Complete -->
      <template v-else>
        <div class="complete-content">
          <div class="success-banner large">
            <CheckCircleIcon class="success-icon" />
            <div class="success-text">
              <p class="success-title">{{ t("safeHarbor.createAgreement.complete") }}</p>
              <p class="success-subtitle">{{ t("safeHarbor.createAgreement.completeDescription") }}</p>
            </div>
          </div>
          <a v-if="adoptTxHash" :href="txLink(adoptTxHash)" target="_blank" class="tx-link-full">
            {{ t("safeHarbor.createAgreement.viewTransaction") }}
            <ExternalLinkIcon class="external-icon" />
          </a>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <div class="modal-footer">
      <button type="button" class="btn-secondary" @click="$emit('close')" :disabled="isCreatingAgreement || isAdopting">
        {{ currentStep === 3 ? t("common.done") : t("common.cancel") }}
      </button>
      <button
        v-if="currentStep === 1"
        type="button"
        class="btn-primary"
        :disabled="isCreatingAgreement || !isFormValid"
        @click="handleCreateAgreement"
      >
        <span v-if="isCreatingAgreement" class="loading-spinner" />
        {{ isCreatingAgreement ? t("common.processing") : t("safeHarbor.createAgreement.createButton") }}
      </button>
      <button
        v-else-if="currentStep === 2"
        type="button"
        class="btn-primary"
        :disabled="isAdopting"
        @click="handleAdoptAgreement"
      >
        <span v-if="isAdopting" class="loading-spinner" />
        {{ isAdopting ? t("common.processing") : t("safeHarbor.createAgreement.adoptButton") }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";

import { CheckCircleIcon, CheckIcon, ExclamationCircleIcon, ExternalLinkIcon, XIcon } from "@heroicons/vue/solid";

import Input from "@/components/common/Input.vue";
import FormItem from "@/components/form/FormItem.vue";

import useAgreementCreation from "@/composables/useAgreementCreation";
import useContext from "@/composables/useContext";

import type { Address, AgreementFormData } from "@/types";
import type { PropType } from "vue";

import { shortValue } from "@/utils/formatters";

const { t } = useI18n();
const context = useContext();

const props = defineProps({
  contractAddress: {
    type: String,
    required: true,
  },
  // Override props for Storybook
  overrideStep: {
    type: Number as PropType<1 | 2 | 3>,
    default: undefined,
  },
  overrideCreating: {
    type: Boolean,
    default: undefined,
  },
  overrideAdopting: {
    type: Boolean,
    default: undefined,
  },
  overrideCreateError: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  overrideAdoptError: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  overrideAgreementAddress: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  overrideCreateTxHash: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  overrideAdoptTxHash: {
    type: String as PropType<string | null>,
    default: undefined,
  },
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "success"): void;
}>();

const {
  currentStep: creationStep,
  isCreatingAgreement: creating,
  createAgreementError: createError,
  agreementAddress: createdAddress,
  createTxHash: createdTxHash,
  isAdopting: adopting,
  adoptError: adoptErr,
  adoptTxHash: adoptedTxHash,
  createAgreement,
  adoptSafeHarbor,
  reset,
} = useAgreementCreation();

// Use overrides or real values
const currentStep = computed(() => props.overrideStep ?? creationStep.value);
const isCreatingAgreement = computed(() => props.overrideCreating ?? creating.value);
const createAgreementError = computed(() => props.overrideCreateError ?? createError.value);
const agreementAddress = computed(() => props.overrideAgreementAddress ?? createdAddress.value);
const createTxHash = computed(() => props.overrideCreateTxHash ?? createdTxHash.value);
const isAdopting = computed(() => props.overrideAdopting ?? adopting.value);
const adoptError = computed(() => props.overrideAdoptError ?? adoptErr.value);
const adoptTxHash = computed(() => props.overrideAdoptTxHash ?? adoptedTxHash.value);

// Default USDC address for bounty cap token
const USDC_ADDRESS = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

const formData = reactive<AgreementFormData>({
  protocolName: "",
  bountyPercentage: 10,
  bountyCap: "5000000",
  bountyCapToken: USDC_ADDRESS as Address,
  allowAnonymous: true,
  contactEmail: "",
  contactDiscord: "",
  contactTelegram: "",
  assetRecoveryAddress: "" as Address,
  agreementURI: "",
});

const errors = reactive({
  protocolName: "",
  bountyPercentage: "",
  bountyCap: "",
  contact: "",
  assetRecoveryAddress: "",
});

const isFormValid = computed(() => {
  // Protocol name required
  if (!formData.protocolName.trim()) return false;
  // Bounty percentage required and valid
  if (!formData.bountyPercentage || formData.bountyPercentage < 1 || formData.bountyPercentage > 100) return false;
  // Bounty cap required
  if (!formData.bountyCap || parseFloat(formData.bountyCap) <= 0) return false;
  // At least one contact method required
  if (!formData.contactEmail && !formData.contactDiscord && !formData.contactTelegram) return false;
  // Asset recovery address required and valid
  if (!formData.assetRecoveryAddress || !/^0x[a-fA-F0-9]{40}$/.test(formData.assetRecoveryAddress)) return false;
  return true;
});

const validateForm = (): boolean => {
  let isValid = true;

  // Reset errors
  errors.protocolName = "";
  errors.bountyPercentage = "";
  errors.bountyCap = "";
  errors.contact = "";
  errors.assetRecoveryAddress = "";

  if (!formData.protocolName.trim()) {
    errors.protocolName = t("safeHarbor.createAgreement.errors.protocolNameRequired");
    isValid = false;
  }

  if (!formData.bountyPercentage || formData.bountyPercentage < 1 || formData.bountyPercentage > 100) {
    errors.bountyPercentage = t("safeHarbor.createAgreement.errors.bountyPercentageInvalid");
    isValid = false;
  }

  if (!formData.bountyCap || parseFloat(formData.bountyCap) <= 0) {
    errors.bountyCap = t("safeHarbor.createAgreement.errors.bountyCapRequired");
    isValid = false;
  }

  if (!formData.contactEmail && !formData.contactDiscord && !formData.contactTelegram) {
    errors.contact = t("safeHarbor.createAgreement.errors.contactRequired");
    isValid = false;
  }

  if (!formData.assetRecoveryAddress) {
    errors.assetRecoveryAddress = t("safeHarbor.createAgreement.errors.recoveryAddressRequired");
    isValid = false;
  } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.assetRecoveryAddress)) {
    errors.assetRecoveryAddress = t("safeHarbor.createAgreement.errors.invalidAddress");
    isValid = false;
  }

  return isValid;
};

const txLink = (hash: string) => {
  const baseUrl = context.currentNetwork.value.rpcUrl.replace(/\/+$/, "");
  return `${baseUrl.replace("rpc", "explorer")}/tx/${hash}`;
};

const handleCreateAgreement = async () => {
  if (!validateForm()) return;
  await createAgreement(formData, props.contractAddress);
};

const handleAdoptAgreement = async () => {
  await adoptSafeHarbor(props.contractAddress);
  if (adoptedTxHash.value) {
    emit("success");
  }
};

// Expose reset for parent component
defineExpose({ reset });
</script>

<style scoped lang="scss">
.create-agreement-modal {
  @apply w-full max-w-lg rounded-lg shadow-xl;
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
  @apply rounded p-1 transition-colors;
  color: var(--text-muted);

  &:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .icon {
    @apply h-5 w-5;
  }
}

.step-indicator {
  @apply flex items-center justify-center gap-2 border-b px-4 py-4 sm:gap-4;
  border-color: var(--border-subtle);
}

.step {
  @apply flex items-center gap-2;

  .step-circle {
    @apply flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium;
    background-color: var(--bg-tertiary);
    color: var(--text-muted);
  }

  .step-label {
    @apply hidden text-sm sm:block;
    color: var(--text-muted);
  }

  &.active {
    .step-circle {
      background-color: var(--accent);
      color: white;
    }
    .step-label {
      color: var(--text-primary);
      font-weight: 500;
    }
  }

  &.completed {
    .step-circle {
      background-color: var(--success);
      color: white;
    }
    .step-label {
      color: var(--success-text);
    }
    .check-icon {
      @apply h-4 w-4;
    }
  }
}

.step-connector {
  @apply h-0.5 w-8 sm:w-12;
  background-color: var(--border-default);

  &.completed {
    background-color: var(--success);
  }
}

.modal-content {
  @apply max-h-[60vh] overflow-y-auto px-4 py-4 sm:px-6;
}

.agreement-form {
  @apply space-y-4;
}

.form-row {
  @apply grid grid-cols-1 gap-4 sm:grid-cols-2;
}

.input-with-suffix,
.input-with-prefix {
  @apply relative flex items-center;

  .suffix,
  .prefix {
    @apply absolute text-sm;
    color: var(--text-muted);
  }

  .suffix {
    @apply right-3;
  }

  .prefix {
    @apply left-3;
  }

  :deep(.input) {
    &:has(+ .suffix) {
      @apply pr-8;
    }
  }
}

.input-with-prefix {
  :deep(.input) {
    @apply pl-6;
  }
}

.checkbox-label {
  @apply flex cursor-pointer items-center gap-2 text-sm;
  color: var(--text-secondary);

  .checkbox {
    @apply h-4 w-4 rounded;
    accent-color: var(--accent);
  }
}

.section-divider {
  @apply flex items-center gap-2 py-2;

  > span {
    @apply text-xs font-medium uppercase tracking-wide;
    color: var(--text-muted);

    .required-indicator {
      @apply ml-0.5 text-red-500;
    }
  }

  &::before,
  &::after {
    @apply h-px flex-1;
    content: "";
    background-color: var(--border-subtle);
  }
}

.error-message {
  @apply flex items-start gap-2 rounded-md p-3;
  background-color: var(--error-muted);
  color: var(--error-text);

  .error-icon {
    @apply h-5 w-5 shrink-0;
    color: var(--error);
  }
}

.step2-content,
.complete-content {
  @apply space-y-4;
}

.success-banner {
  @apply flex items-start gap-3 rounded-lg p-4;
  background-color: var(--success-muted);

  &.large {
    @apply flex-col items-center text-center;

    .success-icon {
      @apply h-12 w-12;
    }
  }

  .success-icon {
    @apply h-6 w-6 shrink-0;
    color: var(--success);
  }

  .success-text {
    @apply flex flex-col gap-1;
  }

  .success-title {
    @apply font-medium;
    color: var(--success-text);
  }

  .success-subtitle {
    @apply text-sm;
    color: var(--text-secondary);
  }

  .success-address {
    @apply flex flex-wrap items-center gap-2 text-sm;
    color: var(--text-secondary);
  }
}

.tx-link,
.tx-link-full {
  @apply inline-flex items-center gap-1 text-sm;
  color: var(--accent);

  &:hover {
    text-decoration: underline;
  }

  .external-icon {
    @apply h-3.5 w-3.5;
  }
}

.tx-link-full {
  @apply justify-center;
}

.step2-description {
  @apply text-sm;
  color: var(--text-secondary);
}

.modal-footer {
  @apply flex justify-end gap-3 border-t px-4 py-3 sm:px-6;
  border-color: var(--border-default);
}

.btn-secondary,
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
