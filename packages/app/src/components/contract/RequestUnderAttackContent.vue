<template>
  <div class="request-under-attack-modal">
    <!-- Header -->
    <div class="modal-header">
      <h2 class="modal-title">{{ t("requestUnderAttackModal.title") }}</h2>
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
        <span class="step-label">{{ t("requestUnderAttackModal.step1Label") }}</span>
      </div>
      <div class="step-connector" :class="{ completed: currentStep > 1 }" />
      <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
        <div class="step-circle">
          <CheckIcon v-if="currentStep > 2" class="check-icon" />
          <span v-else>2</span>
        </div>
        <span class="step-label">{{ t("requestUnderAttackModal.step2Label") }}</span>
      </div>
      <div class="step-connector" :class="{ completed: currentStep > 2 }" />
      <div class="step" :class="{ active: currentStep === 3 }">
        <div class="step-circle">
          <CheckIcon v-if="currentStep === 3" class="check-icon" />
          <span v-else>3</span>
        </div>
        <span class="step-label">{{ t("requestUnderAttackModal.step3Label") }}</span>
      </div>
    </div>

    <!-- Content -->
    <div class="modal-content">
      <!-- Step 1: Select Agreement -->
      <template v-if="currentStep === 1">
        <!-- Radio options for selection mode -->
        <div class="selection-options">
          <label class="radio-option" :class="{ selected: selectionMode === 'detected' }">
            <input v-model="selectionMode" type="radio" value="detected" class="radio-input" />
            <span class="radio-label">{{ t("requestUnderAttackModal.selectDetected") }}</span>
          </label>
          <label class="radio-option" :class="{ selected: selectionMode === 'paste' }">
            <input v-model="selectionMode" type="radio" value="paste" class="radio-input" />
            <span class="radio-label">{{ t("requestUnderAttackModal.pasteAddress") }}</span>
          </label>
          <label class="radio-option" :class="{ selected: selectionMode === 'create' }">
            <input v-model="selectionMode" type="radio" value="create" class="radio-input" />
            <span class="radio-label">{{ t("requestUnderAttackModal.createNew") }}</span>
          </label>
        </div>

        <!-- Detected Agreements View -->
        <div v-if="selectionMode === 'detected'" class="detected-view">
          <!-- Polling indicator -->
          <div class="polling-indicator">
            <span class="loading-spinner" />
            <span>{{ t("requestUnderAttackModal.checkingAgreements") }}</span>
          </div>

          <!-- Waiting for newly created agreement -->
          <div v-if="waitingForDetection" class="waiting-banner">
            <CheckCircleIcon class="success-icon" />
            <div class="waiting-content">
              <p class="waiting-title">{{ t("requestUnderAttackModal.agreementCreated") }}</p>
              <a v-if="createdTxHash" :href="txLink(createdTxHash)" target="_blank" class="tx-link">
                {{ t("requestUnderAttackModal.viewTransaction") }}
                <ExternalLinkIcon class="external-icon" />
              </a>
              <p class="waiting-text">{{ t("requestUnderAttackModal.waitingForDetection") }}</p>
            </div>
          </div>

          <!-- Agreement list -->
          <div v-if="agreements.length > 0" class="agreement-list">
            <button
              v-for="agreement in agreements"
              :key="agreement.agreementAddress"
              type="button"
              class="agreement-card"
              :class="{ selected: selectedAgreementAddress === agreement.agreementAddress }"
              @click="selectAgreement(agreement.agreementAddress)"
            >
              <div class="agreement-name">
                {{ agreement.protocolName || `Agreement ${shortValue(agreement.agreementAddress)}` }}
              </div>
              <div class="agreement-address">{{ shortValue(agreement.agreementAddress) }}</div>
              <div v-if="agreement.bountyPercentage || agreement.bountyCapUsd" class="agreement-terms">
                <span v-if="agreement.bountyPercentage">{{ agreement.bountyPercentage }}%</span>
                <span v-if="agreement.bountyPercentage && agreement.bountyCapUsd"> / </span>
                <span v-if="agreement.bountyCapUsd">${{ formatBountyCap(agreement.bountyCapUsd) }}</span>
              </div>
            </button>
          </div>

          <!-- Empty state -->
          <div v-else-if="!isPolling" class="empty-state">
            <p>{{ t("requestUnderAttackModal.noAgreementsFound") }}</p>
          </div>
        </div>

        <!-- Paste Address View -->
        <div v-else-if="selectionMode === 'paste'" class="paste-view">
          <FormItem :label="t('requestUnderAttackModal.agreementAddress')" required>
            <Input
              v-model="pastedAddress"
              placeholder="0x..."
              :error="pastedAddressError"
              @input="validatePastedAddress"
            />
          </FormItem>
        </div>

        <!-- Create New View -->
        <div v-else-if="selectionMode === 'create'" class="create-view">
          <CreateAgreementContent
            ref="createFormRef"
            :contract-address="contractAddress"
            embedded
            @close="handleCreateClose"
            @success="handleCreateSuccess"
          />
        </div>
      </template>

      <!-- Step 2: Review & Submit -->
      <template v-else-if="currentStep === 2">
        <div class="review-section">
          <!-- Agreement summary header -->
          <div class="agreement-summary">
            <div class="agreement-header">
              <span class="agreement-label">{{ t("requestUnderAttackModal.selectedAgreement") }}</span>
              <span class="agreement-address monospace">{{ shortValue(selectedAgreement!) }}</span>
            </div>
          </div>

          <!-- Contracts affected section -->
          <div class="contracts-affected">
            <h3 class="section-title">
              {{ t("requestUnderAttackModal.contractsAffectedTitle", coveredAccountsCount) }}
            </h3>
            <p class="section-description">
              {{ t("requestUnderAttackModal.contractsAffectedDescription") }}
            </p>

            <ul class="contracts-list">
              <li v-for="account in coveredAccounts" :key="account.accountAddress" class="contract-item">
                <div class="contract-info">
                  <span class="contract-address monospace">{{ shortValue(account.accountAddress) }}</span>
                  <span v-if="isCurrentContract(account.accountAddress)" class="current-badge">
                    {{ t("requestUnderAttackModal.currentContract") }}
                  </span>
                </div>
                <span class="child-scope">{{ getChildScopeLabel(account.childContractScope) }}</span>
              </li>
            </ul>
          </div>

          <!-- Commitment deadline check -->
          <div v-if="isCheckingCommitment" class="commitment-check">
            <span class="loading-spinner" />
            <span>{{ t("requestUnderAttackModal.checkingCommitment") }}</span>
          </div>
          <div v-else-if="!isCommitmentSufficient" class="commitment-warning">
            <ExclamationCircleIcon class="warning-icon" />
            <div class="commitment-content">
              <p class="commitment-title">{{ t("requestUnderAttackModal.commitmentRequired") }}</p>
              <p class="commitment-description">{{ t("requestUnderAttackModal.commitmentDescription") }}</p>
              <div class="commitment-form">
                <label class="commitment-label">
                  {{ t("requestUnderAttackModal.commitmentDeadlineLabel") }}
                  <input v-model="commitmentDeadlineInput" type="date" class="commitment-input" />
                </label>
                <button
                  type="button"
                  class="btn-primary commitment-btn"
                  :disabled="request.isExtending.value || !isWalletConnected || !commitmentDeadlineInput"
                  @click="handleExtendCommitment"
                >
                  <span v-if="request.isExtending.value" class="loading-spinner" />
                  {{
                    request.isExtending.value
                      ? t("requestUnderAttackModal.extendingCommitment")
                      : t("requestUnderAttackModal.extendCommitment")
                  }}
                </button>
              </div>
              <div v-if="extendError" class="error-message">
                <ExclamationCircleIcon class="error-icon" />
                <span>{{ extendError }}</span>
              </div>
            </div>
          </div>
          <div v-else-if="showCommitmentExtendedSuccess" class="commitment-success">
            <CheckCircleIcon class="success-icon" />
            <span>{{ t("requestUnderAttackModal.commitmentExtended") }}</span>
          </div>

          <!-- Bond/Fee requirement -->
          <div v-if="isFetchingBondInfo" class="commitment-check">
            <span class="loading-spinner" />
            <span>{{ t("requestUnderAttackModal.fetchingBondInfo") }}</span>
          </div>
          <template v-else-if="totalRequired > 0n">
            <div class="bond-breakdown">
              <h4 class="bond-title">{{ t("requestUnderAttackModal.bondRequired") }}</h4>
              <div class="bond-row">
                <span class="bond-label">{{ t("requestUnderAttackModal.fee") }}</span>
                <span class="bond-value"
                  >{{ formatTokenAmountDisplay(feeAmount) }} {{ bondTokenSymbol }} ({{
                    t("requestUnderAttackModal.nonRefundable")
                  }})</span
                >
              </div>
              <div class="bond-row">
                <span class="bond-label">{{ t("requestUnderAttackModal.bond") }}</span>
                <span class="bond-value"
                  >{{ formatTokenAmountDisplay(bondAmount) }} {{ bondTokenSymbol }} ({{
                    t("requestUnderAttackModal.refundable")
                  }})</span
                >
              </div>
              <div class="bond-row bond-total">
                <span class="bond-label">{{ t("requestUnderAttackModal.total") }}</span>
                <span class="bond-value">{{ formatTokenAmountDisplay(totalRequired) }} {{ bondTokenSymbol }}</span>
              </div>
            </div>

            <!-- Insufficient balance -->
            <div v-if="hasInsufficientBalance && isWalletConnected" class="error-message">
              <ExclamationCircleIcon class="error-icon" />
              <span>{{ t("requestUnderAttackModal.insufficientBalance", { symbol: bondTokenSymbol }) }}</span>
            </div>

            <!-- Approval needed -->
            <div v-else-if="needsApproval && isWalletConnected" class="commitment-warning">
              <ExclamationCircleIcon class="warning-icon" />
              <div class="commitment-content">
                <p class="commitment-title">{{ t("requestUnderAttackModal.approvalRequired") }}</p>
                <p class="commitment-description">
                  {{ t("requestUnderAttackModal.approvalDescription", { symbol: bondTokenSymbol }) }}
                </p>
                <button type="button" class="btn-primary commitment-btn" :disabled="isApproving" @click="handleApprove">
                  <span v-if="isApproving" class="loading-spinner" />
                  {{ isApproving ? t("requestUnderAttackModal.approving") : t("requestUnderAttackModal.approve") }}
                </button>
                <div v-if="approvalError" class="error-message">
                  <ExclamationCircleIcon class="error-icon" />
                  <span>{{ approvalError }}</span>
                </div>
              </div>
            </div>

            <!-- Approval complete -->
            <div v-else-if="isWalletConnected && !needsApproval" class="commitment-success">
              <CheckCircleIcon class="success-icon" />
              <span>{{ t("requestUnderAttackModal.bondApproved") }}</span>
            </div>
          </template>

          <!-- Not connected state -->
          <div v-if="!isWalletConnected" class="wallet-prompt">
            <p>{{ t("requestUnderAttackModal.connectWalletPrompt") }}</p>
            <button
              type="button"
              class="btn-connect"
              :disabled="isConnectPending || !isMetamaskInstalled"
              @click="connect"
            >
              {{ connectButtonText }}
            </button>
          </div>

          <!-- Error display -->
          <div v-if="requestError" class="error-message">
            <ExclamationCircleIcon class="error-icon" />
            <span>{{ requestError }}</span>
            <button type="button" class="retry-link" @click="resetRequestError">
              {{ t("common.tryAgain") }}
            </button>
          </div>
        </div>
      </template>

      <!-- Step 3: Complete -->
      <template v-else>
        <div class="complete-content">
          <div class="success-banner large">
            <CheckCircleIcon class="success-icon" />
            <div class="success-text">
              <p class="success-title">{{ t("requestUnderAttackModal.complete") }}</p>
              <p class="success-subtitle">{{ t("requestUnderAttackModal.completeDescription") }}</p>
            </div>
          </div>
          <a v-if="requestTxHash" :href="txLink(requestTxHash)" target="_blank" class="tx-link-full">
            {{ t("requestUnderAttackModal.viewTransaction") }}
            <ExternalLinkIcon class="external-icon" />
          </a>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <div class="modal-footer">
      <button v-if="currentStep === 2" type="button" class="btn-secondary" :disabled="isRequesting" @click="goBack">
        {{ t("common.back") }}
      </button>
      <button type="button" class="btn-secondary" :disabled="isRequesting" @click="$emit('close')">
        {{ currentStep === 3 ? t("common.done") : t("common.cancel") }}
      </button>
      <button
        v-if="currentStep === 1 && selectionMode !== 'create'"
        type="button"
        class="btn-primary"
        :disabled="!canProceedToStep2"
        @click="proceedToStep2"
      >
        {{ t("common.continue") }}
      </button>
      <button
        v-else-if="currentStep === 2"
        type="button"
        class="btn-primary"
        :disabled="isRequesting || !isWalletConnected || !isCommitmentSufficient || !isBondReady"
        @click="handleSubmit"
      >
        <span v-if="isRequesting" class="loading-spinner" />
        {{ isRequesting ? t("common.processing") : t("requestUnderAttackModal.submitButton") }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { CheckCircleIcon, CheckIcon, ExclamationCircleIcon, ExternalLinkIcon, XIcon } from "@heroicons/vue/solid";

import Input from "@/components/common/Input.vue";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Component used in template
import CreateAgreementContent from "@/components/contract/CreateAgreementContent.vue";
import FormItem from "@/components/form/FormItem.vue";

import useAgreementList from "@/composables/useAgreementList";
import useContext from "@/composables/useContext";
import useRequestUnderAttack from "@/composables/useRequestUnderAttack";

import type { CoveredAccount, DetectedAgreement } from "@/composables/useAgreementList";
import type { PropType } from "vue";

import { ChildContractScope } from "@/types";
import { formatTokenAmount, shortValue } from "@/utils/formatters";

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
  overrideSelectionMode: {
    type: String as PropType<"detected" | "paste" | "create">,
    default: undefined,
  },
  overrideAgreements: {
    type: Array as PropType<DetectedAgreement[]>,
    default: undefined,
  },
  overrideIsPolling: {
    type: Boolean,
    default: undefined,
  },
  overrideSelectedAgreement: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  overrideRequesting: {
    type: Boolean,
    default: undefined,
  },
  overrideError: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  overrideTxHash: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  overrideWalletConnected: {
    type: Boolean,
    default: undefined,
  },
  overrideWaitingForDetection: {
    type: Boolean,
    default: undefined,
  },
  overrideCreatedTxHash: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  overrideCommitmentSufficient: {
    type: Boolean,
    default: undefined,
  },
  overrideCheckingCommitment: {
    type: Boolean,
    default: undefined,
  },
  overrideExtendError: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  overrideCommitmentExtendedSuccess: {
    type: Boolean,
    default: undefined,
  },
  overrideFetchingBondInfo: {
    type: Boolean,
    default: undefined,
  },
  overrideTotalRequired: {
    type: BigInt as unknown as PropType<bigint>,
    default: undefined,
  },
  overrideFeeAmount: {
    type: BigInt as unknown as PropType<bigint>,
    default: undefined,
  },
  overrideBondAmount: {
    type: BigInt as unknown as PropType<bigint>,
    default: undefined,
  },
  overrideBondTokenSymbol: {
    type: String,
    default: undefined,
  },
  overrideBondTokenDecimals: {
    type: Number,
    default: undefined,
  },
  overrideNeedsApproval: {
    type: Boolean,
    default: undefined,
  },
  overrideInsufficientBalance: {
    type: Boolean,
    default: undefined,
  },
  overrideApproving: {
    type: Boolean,
    default: undefined,
  },
  overrideApprovalError: {
    type: String as PropType<string | null>,
    default: undefined,
  },
  overrideBondReady: {
    type: Boolean,
    default: undefined,
  },
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "success"): void;
}>();

// Agreement list composable
const agreementList = useAgreementList(context);

// Request under attack composable
const request = useRequestUnderAttack(context);

// Local state
const step = ref<1 | 2 | 3>(1);
const mode = ref<"detected" | "paste" | "create">("detected");
const pastedAddress = ref("");
const pastedAddressError = ref("");
const selectedFromList = ref<string | null>(null);
const waitingForDetectionState = ref(false);
const createdTxHashState = ref<string | null>(null);
const createFormRef = ref<InstanceType<typeof CreateAgreementContent> | null>(null);

// Use overrides or real values
const currentStep = computed(() => props.overrideStep ?? step.value);
const selectionMode = computed({
  get: () => props.overrideSelectionMode ?? mode.value,
  set: (val) => {
    mode.value = val;
  },
});
const agreements = computed(() => props.overrideAgreements ?? agreementList.agreements.value);
const isPolling = computed(() => props.overrideIsPolling ?? agreementList.isPolling.value);
const selectedAgreementAddress = computed({
  get: () => props.overrideSelectedAgreement ?? selectedFromList.value,
  set: (val) => {
    selectedFromList.value = val;
  },
});
const isRequesting = computed(() => props.overrideRequesting ?? request.isRequesting.value);
const requestError = computed(() => props.overrideError ?? request.requestError.value);
const requestTxHash = computed(() => props.overrideTxHash ?? request.requestTxHash.value);
const isWalletConnected = computed(() =>
  props.overrideWalletConnected !== undefined ? props.overrideWalletConnected : request.isWalletConnected.value
);
const waitingForDetection = computed(() => props.overrideWaitingForDetection ?? waitingForDetectionState.value);
const createdTxHash = computed(() => props.overrideCreatedTxHash ?? createdTxHashState.value);
const isCommitmentSufficient = computed(() =>
  props.overrideCommitmentSufficient !== undefined
    ? props.overrideCommitmentSufficient
    : request.isCommitmentSufficient.value
);
const isCheckingCommitment = computed(() =>
  props.overrideCheckingCommitment !== undefined ? props.overrideCheckingCommitment : request.isCheckingCommitment.value
);
const extendError = computed(() => props.overrideExtendError ?? request.extendError.value);
const showCommitmentExtendedSuccess = computed(() =>
  props.overrideCommitmentExtendedSuccess !== undefined
    ? props.overrideCommitmentExtendedSuccess
    : commitmentExtendedSuccess.value
);

const isMetamaskInstalled = computed(() => request.isMetamaskInstalled.value);
const isConnectPending = computed(() => request.isConnectPending.value);

// Bond overrides
const isFetchingBondInfo = computed(() =>
  props.overrideFetchingBondInfo !== undefined ? props.overrideFetchingBondInfo : request.isFetchingBondInfo.value
);
const feeAmount = computed(() => props.overrideFeeAmount ?? request.feeAmount.value);
const bondAmount = computed(() => props.overrideBondAmount ?? request.bondAmount.value);
const totalRequired = computed(() => props.overrideTotalRequired ?? request.totalRequired.value);
const bondTokenSymbol = computed(() => props.overrideBondTokenSymbol ?? request.bondTokenSymbol.value);
const bondTokenDecimals = computed(() => props.overrideBondTokenDecimals ?? request.bondTokenDecimals.value);
const hasInsufficientBalance = computed(() =>
  props.overrideInsufficientBalance !== undefined
    ? props.overrideInsufficientBalance
    : request.hasInsufficientBalance.value
);
const needsApproval = computed(() =>
  props.overrideNeedsApproval !== undefined ? props.overrideNeedsApproval : request.needsApproval.value
);
const isApproving = computed(() =>
  props.overrideApproving !== undefined ? props.overrideApproving : request.isApproving.value
);
const approvalError = computed(() => props.overrideApprovalError ?? request.approvalError.value);
const isBondReady = computed(() =>
  props.overrideBondReady !== undefined ? props.overrideBondReady : request.isBondReady.value
);

// Computed values
const selectedAgreement = computed(() => {
  if (selectionMode.value === "paste" && isValidAddress(pastedAddress.value)) {
    return pastedAddress.value;
  }
  if (selectionMode.value === "detected" && selectedAgreementAddress.value) {
    return selectedAgreementAddress.value;
  }
  return null;
});

const canProceedToStep2 = computed(() => !!selectedAgreement.value);

// Get the full agreement data for the selected agreement
const selectedAgreementData = computed(() => {
  if (!selectedAgreementAddress.value) return null;
  return agreements.value.find((a) => a.agreementAddress === selectedAgreementAddress.value) ?? null;
});

// Covered accounts from the selected agreement
const coveredAccounts = computed<CoveredAccount[]>(() => {
  return selectedAgreementData.value?.coveredAccounts ?? [];
});

// Number of covered accounts
const coveredAccountsCount = computed(() => coveredAccounts.value.length);

// Helper to get child scope label
const getChildScopeLabel = (scope: ChildContractScope): string => {
  switch (scope) {
    case ChildContractScope.None:
      return t("requestUnderAttackModal.childScope.none");
    case ChildContractScope.ExistingOnly:
      return t("requestUnderAttackModal.childScope.existingOnly");
    case ChildContractScope.All:
      return t("requestUnderAttackModal.childScope.all");
    case ChildContractScope.FutureOnly:
      return t("requestUnderAttackModal.childScope.futureOnly");
    default:
      return t("requestUnderAttackModal.childScope.none");
  }
};

// Check if an account is the current contract
const isCurrentContract = (accountAddress: string): boolean => {
  return accountAddress.toLowerCase() === props.contractAddress.toLowerCase();
};

const connectButtonText = computed(() => {
  if (isConnectPending.value) {
    return t("requestUnderAttackModal.connecting");
  }
  if (!isMetamaskInstalled.value) {
    return t("requestUnderAttackModal.noWallet");
  }
  return t("requestUnderAttackModal.connectWallet");
});

// Helper functions
const isValidAddress = (addr: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
};

const validatePastedAddress = () => {
  const addr = pastedAddress.value.trim();
  if (addr && !isValidAddress(addr)) {
    pastedAddressError.value = t("requestUnderAttackModal.invalidAddress");
  } else {
    pastedAddressError.value = "";
  }
};

const selectAgreement = (address: string) => {
  selectedAgreementAddress.value = address;
};

const formatBountyCap = (cap: string): string => {
  const num = parseFloat(cap);
  if (isNaN(num)) return cap;
  // Assume stored in smallest unit (6 decimals for USDC)
  const dollars = num / 1e6;
  if (dollars >= 1000000) {
    return `${(dollars / 1000000).toFixed(1)}M`;
  }
  if (dollars >= 1000) {
    return `${(dollars / 1000).toFixed(0)}K`;
  }
  return dollars.toFixed(0);
};

const txLink = (hash: string) => {
  return `/tx/${hash}`;
};

// Commitment deadline state
const commitmentDeadlineInput = ref("");
const commitmentExtendedSuccess = ref(false);

const defaultCommitmentDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
};

const handleExtendCommitment = async () => {
  if (!selectedAgreement.value || !commitmentDeadlineInput.value) return;
  const deadlineSeconds = Math.floor(new Date(commitmentDeadlineInput.value).getTime() / 1000);
  const success = await request.extendCommitmentWindow(selectedAgreement.value, deadlineSeconds);
  if (success) {
    commitmentExtendedSuccess.value = true;
  }
};

const formatTokenAmountDisplay = (amount: bigint) => {
  return formatTokenAmount(amount, bondTokenDecimals.value);
};

const handleApprove = async () => {
  await request.approveToken();
};

// Actions
const proceedToStep2 = () => {
  if (canProceedToStep2.value) {
    step.value = 2;
    agreementList.stopPolling();
    commitmentExtendedSuccess.value = false;
    commitmentDeadlineInput.value = defaultCommitmentDate();
    if (selectedAgreement.value) {
      request.checkCommitmentDeadline(selectedAgreement.value);
    }
    // Fetch bond requirements (runs in parallel with commitment check)
    request.fetchBondRequirements(props.contractAddress);
  }
};

const goBack = () => {
  step.value = 1;
  // Resume polling if in detected mode
  if (mode.value === "detected") {
    agreementList.startPolling(props.contractAddress);
  }
};

const connect = () => {
  request.connect();
};

const handleSubmit = async () => {
  if (!selectedAgreement.value) return;
  await request.requestUnderAttack(selectedAgreement.value, props.contractAddress);
  if (request.requestTxHash.value) {
    step.value = 3;
    emit("success");
  }
};

const resetRequestError = () => {
  request.reset();
};

const handleCreateClose = () => {
  // Switch back to detected mode when create form is closed
  mode.value = "detected";
};

const handleCreateSuccess = (payload: { agreementAddress: string; txHash: string | null }) => {
  // Agreement was created, switch to detected view and wait for it to appear
  waitingForDetectionState.value = true;
  createdTxHashState.value = payload.txHash;
  // Pre-select the newly created agreement
  selectedFromList.value = payload.agreementAddress;
  mode.value = "detected";
  agreementList.startPolling(props.contractAddress);
};

const reset = () => {
  step.value = 1;
  mode.value = "detected";
  pastedAddress.value = "";
  pastedAddressError.value = "";
  selectedFromList.value = null;
  waitingForDetectionState.value = false;
  createdTxHashState.value = null;
  request.reset();
  agreementList.reset();
};

// Start polling when component mounts and mode is detected
onMounted(() => {
  // Skip if using overrides (Storybook mode)
  if (props.overrideAgreements !== undefined) return;

  if (mode.value === "detected") {
    agreementList.startPolling(props.contractAddress);
  }
});

// Watch for mode changes to start/stop polling
watch(
  () => mode.value,
  (newMode) => {
    // Skip if using overrides
    if (props.overrideAgreements !== undefined) return;

    if (newMode === "detected") {
      agreementList.startPolling(props.contractAddress);
    } else {
      agreementList.stopPolling();
    }
  }
);

// Expose reset for parent component
defineExpose({ reset });
</script>

<style scoped lang="scss">
.request-under-attack-modal {
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

.selection-options {
  @apply mb-4 space-y-2;
}

.radio-option {
  @apply flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors;
  border-color: var(--border-default);
  background-color: var(--bg-secondary);

  &:hover {
    border-color: var(--border-hover);
  }

  &.selected {
    border-color: var(--accent);
    background-color: var(--accent-muted);
  }

  .radio-input {
    @apply h-4 w-4;
    accent-color: var(--accent);
  }

  .radio-label {
    @apply text-sm font-medium;
    color: var(--text-primary);
  }
}

.detected-view {
  @apply space-y-3;
}

.polling-indicator {
  @apply flex items-center gap-2 text-sm;
  color: var(--text-muted);
}

.waiting-banner {
  @apply flex items-start gap-3 rounded-lg p-3;
  background-color: var(--success-muted);

  .success-icon {
    @apply h-5 w-5 shrink-0;
    color: var(--success);
  }

  .waiting-content {
    @apply flex flex-col gap-1;
  }

  .waiting-title {
    @apply font-medium text-sm;
    color: var(--success-text);
  }

  .waiting-text {
    @apply text-xs;
    color: var(--text-muted);
  }
}

.agreement-list {
  @apply space-y-2;
}

.agreement-card {
  @apply w-full rounded-lg border p-3 text-left transition-colors;
  border-color: var(--border-default);
  background-color: var(--bg-secondary);

  &:hover {
    border-color: var(--border-hover);
  }

  &.selected {
    border-color: var(--accent);
    background-color: var(--accent-muted);
  }

  .agreement-name {
    @apply font-medium text-sm;
    color: var(--text-primary);
  }

  .agreement-address {
    @apply font-mono text-xs;
    color: var(--text-muted);
  }

  .agreement-terms {
    @apply mt-1 text-xs;
    color: var(--text-secondary);
  }
}

.empty-state {
  @apply rounded-lg border border-dashed p-6 text-center;
  border-color: var(--border-default);

  p {
    @apply text-sm;
    color: var(--text-muted);
  }
}

.paste-view {
  @apply space-y-4;
}

.create-view {
  @apply -mx-4 -mb-4 sm:-mx-6;
}

.review-section {
  @apply space-y-4;
}

.summary-card {
  @apply rounded-lg border p-4;
  border-color: var(--border-default);
  background-color: var(--bg-secondary);

  .summary-title {
    @apply mb-2 text-xs font-medium uppercase tracking-wide;
    color: var(--text-muted);
  }

  .summary-row {
    @apply flex items-center justify-between;

    .label {
      @apply text-sm;
      color: var(--text-secondary);
    }

    .value {
      @apply text-sm font-medium;
      color: var(--text-primary);

      &.monospace {
        @apply font-mono;
      }
    }
  }
}

.agreement-summary {
  @apply rounded-lg border p-3;
  border-color: var(--border-default);
  background-color: var(--bg-secondary);

  .agreement-header {
    @apply flex items-center justify-between gap-2;
  }

  .agreement-label {
    @apply text-sm;
    color: var(--text-muted);
  }

  .agreement-address {
    @apply text-sm font-medium;
    color: var(--text-primary);
  }
}

.contracts-affected {
  .section-title {
    @apply text-base font-medium;
    color: var(--text-primary);
  }

  .section-description {
    @apply mt-1 text-sm;
    color: var(--text-muted);
  }
}

.contracts-list {
  @apply mt-3 space-y-2 pl-0;
  list-style: none;

  .contract-item {
    @apply flex items-center justify-between gap-2 rounded-lg border p-3;
    border-color: var(--border-default);
    background-color: var(--bg-secondary);
  }

  .contract-info {
    @apply flex items-center gap-2;
  }

  .contract-address {
    @apply text-sm;
    color: var(--text-primary);
  }

  .current-badge {
    @apply rounded-full px-2 py-0.5 text-xs font-medium;
    background-color: var(--accent-muted);
    color: var(--accent-text);
  }

  .child-scope {
    @apply text-xs;
    color: var(--text-muted);
  }
}

.commitment-check {
  @apply flex items-center gap-2 text-sm;
  color: var(--text-muted);
}

.commitment-warning {
  @apply flex items-start gap-3 rounded-lg border p-4;
  border-color: var(--warning-border, var(--border-default));
  background-color: var(--warning-bg, var(--bg-secondary));

  .warning-icon {
    @apply h-5 w-5 shrink-0;
    color: var(--warning, var(--text-muted));
  }

  .commitment-content {
    @apply flex flex-1 flex-col gap-2;
  }

  .commitment-title {
    @apply text-sm font-medium;
    color: var(--text-primary);
  }

  .commitment-description {
    @apply text-sm;
    color: var(--text-muted);
  }

  .commitment-form {
    @apply mt-1 flex items-end gap-3;
  }

  .commitment-label {
    @apply flex flex-1 flex-col gap-1 text-xs font-medium;
    color: var(--text-muted);
  }

  .commitment-input {
    @apply mt-1 rounded-md border px-3 py-1.5 text-sm;
    border-color: var(--border-default);
    background-color: var(--bg-primary);
    color: var(--text-primary);
    color-scheme: dark;
  }

  .commitment-btn {
    @apply shrink-0 whitespace-nowrap;
  }
}

.commitment-success {
  @apply flex items-center gap-2 rounded-lg p-3 text-sm;
  background-color: var(--success-muted);
  color: var(--success-text);

  .success-icon {
    @apply h-5 w-5 shrink-0;
    color: var(--success);
  }
}

.bond-breakdown {
  @apply rounded-lg border p-4;
  border-color: var(--border-default);
  background-color: var(--bg-secondary);

  .bond-title {
    @apply mb-3 text-sm font-medium;
    color: var(--text-primary);
  }

  .bond-row {
    @apply flex items-center justify-between py-1;

    .bond-label {
      @apply text-sm;
      color: var(--text-muted);
    }

    .bond-value {
      @apply text-sm font-medium;
      color: var(--text-primary);
    }

    &.bond-total {
      @apply mt-2 border-t pt-2;
      border-color: var(--border-subtle);

      .bond-label,
      .bond-value {
        font-weight: 600;
      }
    }
  }
}

.wallet-prompt {
  @apply rounded-lg border p-4 text-center;
  border-color: var(--warning-border, var(--border-default));
  background-color: var(--warning-bg, var(--bg-secondary));

  p {
    @apply mb-3 text-sm;
    color: var(--text-secondary);
  }
}

.btn-connect {
  @apply rounded-md px-4 py-2 text-sm font-medium;
  background-color: var(--accent);
  color: white;

  &:hover:not(:disabled) {
    background-color: var(--accent-hover);
  }

  &:disabled {
    @apply cursor-not-allowed opacity-50;
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

  .retry-link {
    @apply ml-auto shrink-0 text-sm font-medium underline;
    color: var(--accent);

    &:hover {
      color: var(--accent-hover);
    }
  }
}

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
  @apply h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent;
}

.btn-primary .loading-spinner {
  @apply border-white/30 border-t-white;
}
</style>
