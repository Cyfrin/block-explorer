<template>
  <div class="create-agreement-modal" :class="{ embedded: embedded }">
    <!-- Header (hidden when embedded) -->
    <div v-if="!embedded" class="modal-header">
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
      <div
        class="step"
        :class="{
          active: currentStep === 2,
          completed: currentStep > 2 && wasAdopted,
          skipped: currentStep > 2 && !wasAdopted,
        }"
      >
        <div class="step-circle">
          <CheckIcon v-if="currentStep > 2 && wasAdopted" class="check-icon" />
          <span v-else>2</span>
        </div>
        <span class="step-label">{{ t("safeHarbor.createAgreement.step2Label") }}</span>
        <span class="optional-badge">{{ t("common.optional") }}</span>
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

          <!-- Bounty Terms Section -->
          <div class="section-divider">
            <span>{{ t("safeHarbor.createAgreement.bountySection") }}</span>
          </div>

          <div class="form-row">
            <FormItem :label="t('safeHarbor.createAgreement.bountyPercentage')" required>
              <div class="input-with-suffix">
                <Input
                  v-model.number="formData.bountyTerms.bountyPercentage"
                  type="number"
                  min="1"
                  max="100"
                  :disabled="isCreatingAgreement"
                  :error="errors.bountyPercentage"
                />
                <span class="suffix">%</span>
              </div>
            </FormItem>
            <FormItem :label="t('safeHarbor.createAgreement.bountyCapUsd')" required>
              <div class="input-with-prefix">
                <span class="prefix">$</span>
                <Input
                  v-model="formData.bountyTerms.bountyCapUsd"
                  type="text"
                  :placeholder="t('safeHarbor.createAgreement.bountyCapPlaceholder')"
                  :disabled="isCreatingAgreement"
                  :error="errors.bountyCapUsd"
                />
              </div>
            </FormItem>
          </div>

          <FormItem :label="t('safeHarbor.createAgreement.identityRequirement')" required>
            <select v-model.number="formData.bountyTerms.identity" class="select-input" :disabled="isCreatingAgreement">
              <option :value="0">{{ t("safeHarbor.createAgreement.identityAnonymous") }}</option>
              <option :value="1">{{ t("safeHarbor.createAgreement.identityPseudonymous") }}</option>
              <option :value="2">{{ t("safeHarbor.createAgreement.identityNamed") }}</option>
            </select>
          </FormItem>

          <FormItem>
            <label class="checkbox-label">
              <input
                v-model="formData.bountyTerms.retainable"
                type="checkbox"
                class="checkbox"
                :disabled="isCreatingAgreement"
              />
              <span>{{ t("safeHarbor.createAgreement.retainable") }}</span>
            </label>
            <template #underline>
              {{ t("safeHarbor.createAgreement.retainableHint") }}
            </template>
          </FormItem>

          <FormItem
            v-if="formData.bountyTerms.identity === 2"
            :label="t('safeHarbor.createAgreement.diligenceRequirements')"
          >
            <Input
              v-model="formData.bountyTerms.diligenceRequirements"
              :placeholder="t('safeHarbor.createAgreement.diligencePlaceholder')"
              :disabled="isCreatingAgreement"
            />
          </FormItem>

          <FormItem :label="t('safeHarbor.createAgreement.aggregateBountyCapUsd')">
            <div class="input-with-prefix">
              <span class="prefix">$</span>
              <Input
                v-model="formData.bountyTerms.aggregateBountyCapUsd"
                type="text"
                :placeholder="t('safeHarbor.createAgreement.aggregateCapPlaceholder')"
                :disabled="isCreatingAgreement"
              />
            </div>
            <template #underline>
              {{ t("safeHarbor.createAgreement.aggregateCapHint") }}
            </template>
          </FormItem>

          <!-- Contact Information Section -->
          <div class="section-divider">
            <span>{{ t("safeHarbor.createAgreement.contactSection") }}<span class="required-indicator">*</span></span>
          </div>

          <div v-for="(contact, index) in formData.contactDetails" :key="index" class="contact-row">
            <FormItem :label="index === 0 ? t('safeHarbor.createAgreement.contactType') : ''" class="contact-name">
              <select v-model="contact.name" class="select-input" :disabled="isCreatingAgreement">
                <option value="Email">{{ t("safeHarbor.createAgreement.contactEmail") }}</option>
                <option value="Discord">{{ t("safeHarbor.createAgreement.contactDiscord") }}</option>
                <option value="Telegram">{{ t("safeHarbor.createAgreement.contactTelegram") }}</option>
                <option value="Twitter">{{ t("safeHarbor.createAgreement.contactTwitter") }}</option>
                <option value="Other">{{ t("safeHarbor.createAgreement.contactOther") }}</option>
              </select>
            </FormItem>
            <FormItem
              :label="index === 0 ? t('safeHarbor.createAgreement.contactValue') : ''"
              class="contact-value"
              :error="index === 0 ? errors.contact : ''"
            >
              <Input
                v-model="contact.contact"
                :placeholder="getContactPlaceholder(contact.name)"
                :disabled="isCreatingAgreement"
              />
            </FormItem>
            <button
              v-if="formData.contactDetails.length > 1"
              type="button"
              class="remove-contact-button"
              :class="{ 'with-label': index === 0 }"
              @click="removeContact(index)"
              :disabled="isCreatingAgreement"
            >
              <XIcon class="icon" />
            </button>
          </div>

          <button type="button" class="add-contact-button" @click="addContact" :disabled="isCreatingAgreement">
            <PlusIcon class="icon" />
            {{ t("safeHarbor.createAgreement.addContact") }}
          </button>

          <!-- Chain Configuration Section -->
          <div class="section-divider">
            <span>{{ t("safeHarbor.createAgreement.chainSection") }}</span>
          </div>

          <FormItem :label="t('safeHarbor.createAgreement.recoveryAddress')" required>
            <Input
              v-model="formData.chains[0].assetRecoveryAddress"
              :placeholder="t('safeHarbor.createAgreement.recoveryAddressPlaceholder')"
              :disabled="isCreatingAgreement"
              :error="errors.assetRecoveryAddress"
            />
            <template #underline>
              {{ t("safeHarbor.createAgreement.recoveryAddressHint") }}
            </template>
          </FormItem>

          <FormItem :label="t('safeHarbor.createAgreement.coveredContracts')" :error="errors.firstContract" required>
            <!-- Primary contract - locked when contractAddress prop provided, editable in standalone mode -->
            <div class="contract-row">
              <div class="contract-address">
                <Input
                  v-if="isStandaloneMode"
                  v-model="formData.chains[0].accounts[0].accountAddress"
                  :placeholder="t('safeHarbor.createAgreement.contractAddressPlaceholder')"
                  :disabled="isCreatingAgreement"
                />
                <Input v-else :model-value="props.contractAddress" disabled />
              </div>
              <div class="contract-scope">
                <select
                  v-model.number="formData.chains[0].accounts[0].childContractScope"
                  class="select-input select-sm"
                  :disabled="isCreatingAgreement"
                >
                  <option :value="0">{{ t("safeHarbor.createAgreement.scopeNone") }}</option>
                  <option :value="1">{{ t("safeHarbor.createAgreement.scopeExisting") }}</option>
                  <option :value="2">{{ t("safeHarbor.createAgreement.scopeAll") }}</option>
                  <option :value="3">{{ t("safeHarbor.createAgreement.scopeFuture") }}</option>
                </select>
              </div>
              <!-- Spacer for alignment with removable rows -->
              <div class="contract-remove-spacer" />
            </div>

            <!-- Additional contracts -->
            <div v-for="(account, index) in additionalAccounts" :key="index" class="contract-row">
              <div class="contract-address">
                <Input
                  v-model="account.accountAddress"
                  :placeholder="t('safeHarbor.createAgreement.contractAddressPlaceholder')"
                  :disabled="isCreatingAgreement"
                />
              </div>
              <div class="contract-scope">
                <select
                  v-model.number="account.childContractScope"
                  class="select-input select-sm"
                  :disabled="isCreatingAgreement"
                >
                  <option :value="0">{{ t("safeHarbor.createAgreement.scopeNone") }}</option>
                  <option :value="1">{{ t("safeHarbor.createAgreement.scopeExisting") }}</option>
                  <option :value="2">{{ t("safeHarbor.createAgreement.scopeAll") }}</option>
                  <option :value="3">{{ t("safeHarbor.createAgreement.scopeFuture") }}</option>
                </select>
              </div>
              <button
                type="button"
                class="remove-contract-button"
                @click="removeContract(index)"
                :disabled="isCreatingAgreement"
              >
                <XIcon class="icon" />
              </button>
            </div>

            <button type="button" class="add-contract-button" @click="addContract" :disabled="isCreatingAgreement">
              <PlusIcon class="icon" />
              {{ t("safeHarbor.createAgreement.addContract") }}
            </button>

            <template #underline>
              {{ t("safeHarbor.createAgreement.coveredContractsHint") }}
            </template>
          </FormItem>

          <!-- Additional Settings Section -->
          <div class="section-divider">
            <span>{{ t("safeHarbor.createAgreement.additionalSection") }}</span>
          </div>

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

      <!-- Step 2: Adopt Agreement (Optional) -->
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

          <div class="adopt-section">
            <p class="step2-description">
              {{ t("safeHarbor.createAgreement.adoptDescription") }}
            </p>
            <p class="step2-optional-note">
              {{ t("safeHarbor.createAgreement.adoptOptionalNote") }}
            </p>
          </div>

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
              <p class="success-title">
                {{
                  wasAdopted
                    ? t("safeHarbor.createAgreement.complete")
                    : t("safeHarbor.createAgreement.completeCreatedOnly")
                }}
              </p>
              <p class="success-subtitle">
                {{
                  wasAdopted
                    ? t("safeHarbor.createAgreement.completeDescription")
                    : t("safeHarbor.createAgreement.completeCreatedOnlyDescription")
                }}
              </p>
            </div>
          </div>
          <a v-if="adoptTxHash" :href="txLink(adoptTxHash)" target="_blank" class="tx-link-full">
            {{ t("safeHarbor.createAgreement.viewAdoptTransaction") }}
            <ExternalLinkIcon class="external-icon" />
          </a>
          <a v-else-if="createTxHash" :href="txLink(createTxHash)" target="_blank" class="tx-link-full">
            {{ t("safeHarbor.createAgreement.viewTransaction") }}
            <ExternalLinkIcon class="external-icon" />
          </a>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <div class="modal-footer">
      <!-- Cancel/Done button (hidden in embedded mode and on step 2, where Skip handles the
           "exit without adopting" path with proper success-event propagation) -->
      <button
        v-if="!embedded && currentStep !== 2"
        type="button"
        class="btn-secondary"
        @click="$emit('close')"
        :disabled="isCreatingAgreement || isAdopting"
      >
        {{ currentStep === 3 ? t("common.done") : t("common.cancel") }}
      </button>
      <!-- Step 1: Create button -->
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
      <!-- Step 2: Skip and Adopt buttons -->
      <template v-else-if="currentStep === 2">
        <button type="button" class="btn-tertiary" :disabled="isAdopting" @click="handleSkipAdopt">
          {{ t("safeHarbor.createAgreement.skipButton") }}
        </button>
        <button type="button" class="btn-primary" :disabled="isAdopting" @click="handleAdoptAgreement">
          <span v-if="isAdopting" class="loading-spinner" />
          {{ isAdopting ? t("common.processing") : t("safeHarbor.createAgreement.adoptButton") }}
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";

import {
  CheckCircleIcon,
  CheckIcon,
  ExclamationCircleIcon,
  ExternalLinkIcon,
  PlusIcon,
  XIcon,
} from "@heroicons/vue/solid";

import Input from "@/components/common/Input.vue";
import FormItem from "@/components/form/FormItem.vue";

import useAgreementCreation from "@/composables/useAgreementCreation";
import useContext from "@/composables/useContext";

import type { AgreementFormData } from "@/types";
import type { PropType } from "vue";

import { ChildContractScope } from "@/types";
import { shortValue } from "@/utils/formatters";

const { t } = useI18n();
const context = useContext();

const props = defineProps({
  contractAddress: {
    type: String,
    default: "",
  },
  // When embedded in another component (e.g., RequestUnderAttackContent),
  // hides the header and cancel button
  embedded: {
    type: Boolean,
    default: false,
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
  overrideWasAdopted: {
    type: Boolean,
    default: undefined,
  },
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "success", payload: { agreementAddress: string; txHash: string | null }): void;
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

// Local override used to advance to step 3 manually (e.g. skip-adopt flow).
const localStepOverride = ref<number | null>(null);

// Use overrides or real values
const currentStep = computed(() => props.overrideStep ?? localStepOverride.value ?? creationStep.value);
const isCreatingAgreement = computed(() => props.overrideCreating ?? creating.value);
const createAgreementError = computed(() => props.overrideCreateError ?? createError.value);
const agreementAddress = computed(() => props.overrideAgreementAddress ?? createdAddress.value);
const createTxHash = computed(() => props.overrideCreateTxHash ?? createdTxHash.value);
const isAdopting = computed(() => props.overrideAdopting ?? adopting.value);
const adoptError = computed(() => props.overrideAdoptError ?? adoptErr.value);
const adoptTxHash = computed(() => props.overrideAdoptTxHash ?? adoptedTxHash.value);

// Track whether user adopted or skipped
const didAdopt = ref(false);
const wasAdopted = computed(() => props.overrideWasAdopted ?? didAdopt.value);

// Get CAIP-2 chain ID from network config
const caip2ChainId = computed(() => `eip155:${context.currentNetwork.value.l2ChainId}`);

// Standalone mode: when no contractAddress is provided
const isStandaloneMode = computed(() => !props.contractAddress);

const formData = reactive<AgreementFormData>({
  protocolName: "",
  contactDetails: [{ name: "Email", contact: "" }],
  chains: [
    {
      caip2ChainId: caip2ChainId.value,
      assetRecoveryAddress: "",
      accounts: [
        {
          accountAddress: props.contractAddress || "",
          childContractScope: ChildContractScope.None, // Only this contract
        },
      ],
    },
  ],
  bountyTerms: {
    bountyPercentage: 10,
    bountyCapUsd: "5000000",
    retainable: false,
    identity: 0, // Anonymous
    diligenceRequirements: "",
    aggregateBountyCapUsd: "",
  },
  agreementURI: context.currentNetwork.value.defaultAgreementURI || "",
});

const errors = reactive({
  protocolName: "",
  bountyPercentage: "",
  bountyCapUsd: "",
  contact: "",
  assetRecoveryAddress: "",
  firstContract: "",
});

const isFormValid = computed(() => {
  // Protocol name required
  if (!formData.protocolName.trim()) return false;
  // Bounty percentage required and valid
  if (
    !formData.bountyTerms.bountyPercentage ||
    formData.bountyTerms.bountyPercentage < 1 ||
    formData.bountyTerms.bountyPercentage > 100
  )
    return false;
  // Bounty cap required
  if (!formData.bountyTerms.bountyCapUsd || parseFloat(formData.bountyTerms.bountyCapUsd) <= 0) return false;
  // At least one contact with value required
  if (!formData.contactDetails.some((c) => c.contact.trim())) return false;
  // Asset recovery address required and valid
  if (!formData.chains[0].assetRecoveryAddress || !/^0x[a-fA-F0-9]{40}$/.test(formData.chains[0].assetRecoveryAddress))
    return false;
  // In standalone mode, at least one valid contract address required
  if (isStandaloneMode.value) {
    const hasValidContract = formData.chains[0].accounts.some(
      (acc) => acc.accountAddress && /^0x[a-fA-F0-9]{40}$/.test(acc.accountAddress)
    );
    if (!hasValidContract) return false;
  }
  return true;
});

const validateForm = (): boolean => {
  let isValid = true;

  // Reset errors
  errors.protocolName = "";
  errors.bountyPercentage = "";
  errors.bountyCapUsd = "";
  errors.contact = "";
  errors.assetRecoveryAddress = "";
  errors.firstContract = "";

  if (!formData.protocolName.trim()) {
    errors.protocolName = t("safeHarbor.createAgreement.errors.protocolNameRequired");
    isValid = false;
  }

  if (
    !formData.bountyTerms.bountyPercentage ||
    formData.bountyTerms.bountyPercentage < 1 ||
    formData.bountyTerms.bountyPercentage > 100
  ) {
    errors.bountyPercentage = t("safeHarbor.createAgreement.errors.bountyPercentageInvalid");
    isValid = false;
  }

  if (!formData.bountyTerms.bountyCapUsd || parseFloat(formData.bountyTerms.bountyCapUsd) <= 0) {
    errors.bountyCapUsd = t("safeHarbor.createAgreement.errors.bountyCapRequired");
    isValid = false;
  }

  if (!formData.contactDetails.some((c) => c.contact.trim())) {
    errors.contact = t("safeHarbor.createAgreement.errors.contactRequired");
    isValid = false;
  }

  if (!formData.chains[0].assetRecoveryAddress) {
    errors.assetRecoveryAddress = t("safeHarbor.createAgreement.errors.recoveryAddressRequired");
    isValid = false;
  } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.chains[0].assetRecoveryAddress)) {
    errors.assetRecoveryAddress = t("safeHarbor.createAgreement.errors.invalidAddress");
    isValid = false;
  }

  // In standalone mode, validate first contract address
  if (isStandaloneMode.value) {
    const firstContract = formData.chains[0].accounts[0]?.accountAddress;
    if (!firstContract) {
      errors.firstContract = t("safeHarbor.createAgreement.errors.contractRequired");
      isValid = false;
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(firstContract)) {
      errors.firstContract = t("safeHarbor.createAgreement.errors.invalidAddress");
      isValid = false;
    }
  }

  return isValid;
};

const getContactPlaceholder = (contactType: string): string => {
  switch (contactType) {
    case "Email":
      return t("safeHarbor.createAgreement.emailPlaceholder");
    case "Discord":
      return t("safeHarbor.createAgreement.discordPlaceholder");
    case "Telegram":
      return t("safeHarbor.createAgreement.telegramPlaceholder");
    case "Twitter":
      return t("safeHarbor.createAgreement.twitterPlaceholder");
    default:
      return t("safeHarbor.createAgreement.otherPlaceholder");
  }
};

const addContact = () => {
  formData.contactDetails.push({ name: "Email", contact: "" });
};

const removeContact = (index: number) => {
  formData.contactDetails.splice(index, 1);
};

// Additional contracts (excluding the primary one at index 0)
const additionalAccounts = computed(() => formData.chains[0].accounts.slice(1));

const addContract = () => {
  formData.chains[0].accounts.push({
    accountAddress: "",
    childContractScope: ChildContractScope.None,
  });
};

const removeContract = (index: number) => {
  // index is relative to additionalAccounts, so add 1 for the actual array index
  formData.chains[0].accounts.splice(index + 1, 1);
};

const txLink = (hash: string) => {
  const baseUrl = context.currentNetwork.value.rpcUrl.replace(/\/+$/, "");
  return `${baseUrl.replace("rpc", "explorer")}/tx/${hash}`;
};

const handleCreateAgreement = async () => {
  if (!validateForm()) return;

  // Update the chain config with current values
  formData.chains[0].caip2ChainId = caip2ChainId.value;

  // In standalone mode, use the first account address from the form
  // Otherwise, use the prop value
  const primaryContract = isStandaloneMode.value
    ? formData.chains[0].accounts[0].accountAddress
    : props.contractAddress;

  if (!isStandaloneMode.value) {
    formData.chains[0].accounts[0].accountAddress = props.contractAddress;
  }

  await createAgreement(formData, primaryContract);
};

const handleAdoptAgreement = async () => {
  const primaryContract = isStandaloneMode.value
    ? formData.chains[0].accounts[0].accountAddress
    : props.contractAddress;
  await adoptSafeHarbor(primaryContract);
  if (adoptedTxHash.value) {
    didAdopt.value = true;
    emit("success", {
      agreementAddress: createdAddress.value!,
      txHash: adoptedTxHash.value,
    });
    // In embedded mode, parent handles the completion - don't show step 3
    if (!props.embedded) {
      localStepOverride.value = 3;
    }
  }
};

const handleSkipAdopt = () => {
  didAdopt.value = false;
  emit("success", {
    agreementAddress: createdAddress.value!,
    txHash: createdTxHash.value,
  });
  // In embedded mode, parent handles the completion - don't show step 3
  if (!props.embedded) {
    localStepOverride.value = 3;
  }
};

// Reset function that also resets local state
const resetAll = () => {
  reset();
  didAdopt.value = false;
  localStepOverride.value = null;
};

// Expose reset for parent component
defineExpose({ reset: resetAll });
</script>

<style scoped lang="scss">
.create-agreement-modal {
  @apply w-full max-w-lg rounded-lg shadow-xl;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);

  &.embedded {
    @apply max-w-none rounded-none shadow-none;
    border: none;
    background-color: transparent;
  }
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
    @apply flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium;
    background-color: var(--bg-tertiary);
    color: var(--text-muted);

    .check-icon {
      @apply h-4 w-4;
    }
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
  }

  &.skipped {
    .step-circle {
      background-color: var(--bg-quaternary);
      color: var(--text-muted);
    }
    .step-label {
      color: var(--text-muted);
    }
  }

  .optional-badge {
    @apply hidden rounded px-1.5 py-0.5 text-xs sm:inline;
    background-color: var(--bg-tertiary);
    color: var(--text-muted);
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
    @apply pointer-events-none absolute z-10 text-sm;
    color: var(--text-muted);
  }

  .suffix {
    @apply right-3;
  }

  .prefix {
    @apply left-3;
  }

  :deep(.input-container) {
    @apply w-full;
  }

  :deep(.input) {
    &:has(+ .suffix) {
      @apply pr-8;
    }
  }
}

.input-with-prefix {
  :deep(.input) {
    @apply pl-7;
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

.select-input {
  @apply w-full appearance-none rounded-md border px-3 py-2 pr-8 text-sm;
  background-color: var(--bg-primary);
  border-color: var(--border-default);
  color: var(--text-primary);
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;

  &:hover:not(:disabled) {
    border-color: var(--border-strong);
  }

  &:focus {
    border-color: var(--accent);
    outline: none;
    box-shadow: 0 0 0 3px var(--accent-muted);
  }

  &:disabled {
    @apply cursor-not-allowed;
    background-color: var(--bg-tertiary);
    color: var(--text-muted);
  }
}

.contract-row {
  @apply flex flex-wrap items-center gap-2 mb-2;

  .contract-address {
    @apply w-full sm:flex-1 sm:w-auto;
  }

  .contract-scope {
    @apply w-full sm:w-40 shrink-0;
  }

  .contract-remove-spacer {
    @apply hidden sm:block w-8 shrink-0;
  }
}

.remove-contract-button {
  @apply rounded p-1.5 transition-colors shrink-0;
  color: var(--text-muted);

  &:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
    color: var(--error);
  }

  &:disabled {
    @apply cursor-not-allowed opacity-50;
  }

  .icon {
    @apply h-4 w-4;
  }
}

.add-contract-button {
  @apply flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors;
  color: var(--accent);

  &:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
  }

  &:disabled {
    @apply cursor-not-allowed opacity-50;
  }

  .icon {
    @apply h-4 w-4;
  }
}

.select-sm {
  @apply py-1.5 text-sm;
}

.contact-row {
  @apply flex items-end gap-2;

  .contact-name {
    @apply w-32 shrink-0;
  }

  .contact-value {
    @apply flex-1;
  }
}

.remove-contact-button {
  @apply mb-1 rounded p-1.5 transition-colors;
  color: var(--text-muted);

  &.with-label {
    @apply mb-1;
  }

  &:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
    color: var(--error);
  }

  &:disabled {
    @apply cursor-not-allowed opacity-50;
  }

  .icon {
    @apply h-4 w-4;
  }
}

.add-contact-button {
  @apply flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors;
  color: var(--accent);

  &:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
  }

  &:disabled {
    @apply cursor-not-allowed opacity-50;
  }

  .icon {
    @apply h-4 w-4;
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

.adopt-section {
  @apply space-y-2;
}

.step2-description {
  @apply text-sm;
  color: var(--text-secondary);
}

.step2-optional-note {
  @apply text-xs;
  color: var(--text-muted);
}

.modal-footer {
  @apply flex justify-end gap-3 border-t px-4 py-3 sm:px-6;
  border-color: var(--border-default);
}

.btn-secondary,
.btn-tertiary,
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

.btn-tertiary {
  background-color: transparent;
  color: var(--text-muted);

  &:hover:not(:disabled) {
    color: var(--text-secondary);
    background-color: var(--bg-tertiary);
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
