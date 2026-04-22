<template>
  <div class="agreement-details">
    <!-- Combined Header with State Info -->
    <div class="agreement-header-card" :class="headerStateClass">
      <!-- Protocol Name & Address -->
      <div class="header-main">
        <div class="header-icon">
          <component :is="stateBannerIcon" class="icon" />
        </div>
        <div class="header-content">
          <div class="header-name-row">
            <template v-if="isEditingProtocolName">
              <input
                v-model="editForms.protocolName"
                type="text"
                class="protocol-name-input"
                :placeholder="t('safeHarbor.edit.protocolNamePlaceholder')"
              />
              <button @click="saveProtocolName" :disabled="isSaving" class="btn-inline-save">
                <Spinner v-if="isSaving" size="xs" color="white" />
                <CheckIcon v-else class="icon" />
              </button>
              <button @click="cancelEditing" :disabled="isSaving" class="btn-inline-cancel">
                <XIcon class="icon" />
              </button>
            </template>
            <template v-else>
              <h2 class="protocol-name" :title="agreement.protocolName || undefined">
                {{ agreement.protocolName || t("safeHarbor.defaultProtocolName") }}
              </h2>
              <Badge v-if="stateBannerTitle" :color="stateBadgeColor">{{ stateBannerTitle }}</Badge>
              <button
                v-if="isOwner"
                @click="startEditingProtocolName"
                class="btn-inline-edit"
                :title="t('safeHarbor.edit.editProtocolName')"
              >
                <PencilIcon class="icon" />
              </button>
            </template>
          </div>
          <div class="agreement-address">
            <span class="address-label">{{ t("safeHarbor.agreementContract") }}:</span>
            <AddressLink :address="agreement.agreementAddress" class="address-link" new-tab>
              <span class="address-value">{{ shortValue(agreement.agreementAddress) }}</span>
              <ExternalLinkIcon class="link-icon" />
            </AddressLink>
          </div>
          <div v-if="saveError && activeSection === 'protocolName'" class="header-error">{{ saveError }}</div>
        </div>
      </div>

      <!-- State Description -->
      <p v-if="showStateBanner" class="state-description">{{ stateBannerDescription }}</p>

      <!-- Request Promotion Button - only for UNDER_ATTACK state, attack moderators -->
      <button
        v-if="isUnderAttack && !isPromotionPending && isAttackModerator"
        type="button"
        class="request-promotion-button"
        @click="$emit('request-promotion')"
      >
        {{ t("safeHarbor.requestPromotionButton") }}
      </button>

      <!-- Cancel Promotion Button - only for PROMOTION_REQUESTED state, attack moderators -->
      <button
        v-if="isPromotionPending && isAttackModerator"
        type="button"
        class="cancel-promotion-button"
        @click="$emit('cancel-promotion')"
      >
        {{ t("safeHarbor.cancelPromotionButton") }}
      </button>

      <div class="header-meta">
        <!-- Value at Risk (read-only estimation) -->
        <div v-if="agreement.valueBand" class="value-at-risk-inline">
          <h4 class="meta-label">{{ t("safeHarbor.tvl.title") }}</h4>
          <div class="value-band-row">
            <Badge :color="valueBandColor" size="md">
              <template #icon>
                <svg viewBox="0 0 10 10" class="confidence-icon">
                  <circle v-if="agreement.valueConfidence === 'HIGH'" cx="5" cy="5" r="4" fill="currentColor" />
                  <template v-else-if="agreement.valueConfidence === 'MEDIUM'">
                    <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1" />
                    <path d="M5 1 A4 4 0 0 1 5 9 Z" fill="currentColor" />
                  </template>
                  <circle v-else cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" stroke-width="1" />
                </svg>
              </template>
              {{ agreement.valueBand }}
            </Badge>
            <span class="confidence-label">
              {{ t(`safeHarbor.tvl.confidence.${(agreement.valueConfidence || "LOW").toLowerCase()}`) }}
            </span>
          </div>
          <div v-if="agreement.valuePricedTokens?.length" class="token-breakdown">
            <div v-for="token in agreement.valuePricedTokens" :key="token.address" class="token-line">
              <span class="token-symbol">{{ token.symbol }}</span>
              <span class="token-separator" />
              <span class="token-usd">${{ token.usd.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</span>
            </div>
          </div>
          <div v-if="agreement.valueUnpricedTokens?.length" class="token-breakdown unpriced">
            <span class="unpriced-label">{{ t("safeHarbor.tvl.couldNotBePriced") }}:</span>
            <span class="unpriced-tokens">
              {{ agreement.valueUnpricedTokens.map((t) => t.symbol || shortValue(t.address)).join(", ") }}
            </span>
          </div>
          <div v-if="agreement.valueEstimatedAt" class="value-detail muted">
            <TimeField :value="new Date(agreement.valueEstimatedAt).toISOString()" :format="TimeFormat.TIME_AGO" />
          </div>
        </div>

        <!-- Commitment Window Status (inline) -->
        <EditableSection
          class="commitment-section-inline"
          :title="t('safeHarbor.commitmentWindow')"
          :is-editing="activeSection === 'commitmentWindow'"
          :can-edit="isOwner"
          :is-saving="isSaving"
          :can-save="canSaveCommitmentWindow"
          :error="activeSection === 'commitmentWindow' ? saveError : null"
          @edit="startEditing('commitmentWindow')"
          @save="saveCommitmentWindow"
          @cancel="cancelCommitmentWindowEdit"
        >
          <CommitmentWindowStatus :deadline="agreement.commitmentDeadline" :is-editing="false" />
          <template #edit-form>
            <CommitmentWindowStatus
              ref="commitmentWindowFormRef"
              :deadline="agreement.commitmentDeadline"
              :is-editing="true"
              @update:deadline="newCommitmentDeadline = $event"
            />
          </template>
        </EditableSection>
      </div>
    </div>

    <!-- Commitment Window Restrictions Banner - shows when owner & locked -->
    <div v-if="isOwner && isTermsLocked" class="restriction-banner">
      <InformationCircleIcon class="icon" />
      <span>{{ t("safeHarbor.edit.lockedRestrictions") }}</span>
    </div>

    <!-- Details Grid -->
    <div class="details-grid">
      <!-- Bounty Terms Section -->
      <EditableSection
        :title="t('safeHarbor.bountyTerms')"
        :is-editing="activeSection === 'bountyTerms'"
        :can-edit="isOwner"
        :is-saving="isSaving"
        :can-save="canSaveBountyTerms"
        :error="activeSection === 'bountyTerms' ? saveError : null"
        @edit="startEditing('bountyTerms')"
        @save="saveBountyTerms"
        @cancel="cancelEditing"
      >
        <template #default>
          <div class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.bountyPercentage") }}</span>
            <span class="detail-value highlight">{{ agreement.bountyPercentage }}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.bountyCap") }}</span>
            <span class="detail-value">{{ formattedBountyCap }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.identityRequirement") }}</span>
            <span class="detail-value">{{ identityRequirementLabel }}</span>
          </div>
          <div v-if="agreement.retainable !== undefined" class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.retainable") }}</span>
            <span class="detail-value" :class="agreement.retainable ? 'allowed' : 'not-allowed'">
              {{ agreement.retainable ? t("safeHarbor.yes") : t("safeHarbor.no") }}
            </span>
          </div>
          <div v-if="agreement.aggregateBountyCapUsd && agreement.aggregateBountyCapUsd !== '0'" class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.aggregateBountyCap") }}</span>
            <span class="detail-value">{{ formattedAggregateBountyCap }}</span>
          </div>
        </template>
        <template #edit-form>
          <BountyTermsForm
            ref="bountyTermsFormRef"
            v-model="editForms.bountyTerms"
            :is-locked="isTermsLocked"
            :original-values="originalBountyTerms"
          />
        </template>
      </EditableSection>

      <!-- Contact Information Section -->
      <EditableSection
        :title="t('safeHarbor.contactInfo')"
        :is-editing="activeSection === 'contacts'"
        :can-edit="isOwner"
        :is-saving="isSaving"
        :error="activeSection === 'contacts' ? saveError : null"
        @edit="startEditing('contacts')"
        @save="saveContacts"
        @cancel="cancelEditing"
      >
        <template #default>
          <template v-if="agreement.contactDetails && agreement.contactDetails.length > 0">
            <div v-for="(contact, index) in agreement.contactDetails" :key="index" class="detail-row">
              <span class="detail-label contact-name" :title="contact.name.length > 30 ? contact.name : undefined">
                {{ truncateString(contact.name, 30) }}
              </span>
              <a
                v-if="isEmailContact(contact.contact)"
                :href="sanitizeHref(`mailto:${contact.contact}`)"
                class="detail-value link contact-value"
                :title="contact.contact.length > 50 ? contact.contact : undefined"
              >
                {{ truncateString(contact.contact, 50) }}
              </a>
              <a
                v-else-if="isLinkableContact(contact.contact)"
                :href="formatContactLink(contact)"
                target="_blank"
                rel="noopener noreferrer"
                class="detail-value link contact-value"
                :title="contact.contact.length > 50 ? contact.contact : undefined"
              >
                {{ truncateString(contact.contact, 50) }}
              </a>
              <span
                v-else
                class="detail-value contact-value"
                :title="contact.contact.length > 50 ? contact.contact : undefined"
              >
                {{ truncateString(contact.contact, 50) }}
              </span>
            </div>
          </template>
          <div v-else class="no-contacts">
            {{ t("safeHarbor.noContactInfo") }}
          </div>
        </template>
        <template #edit-form>
          <ContactsForm v-model="editForms.contacts" />
        </template>
      </EditableSection>

      <!-- Covered Contracts Section -->
      <EditableSection
        v-if="coveredAccountsWithScope.length > 0 || isOwner"
        class="full-width"
        :title="t('safeHarbor.coveredContracts')"
        :is-editing="activeSection === 'coveredContracts'"
        :can-edit="isOwner"
        :is-saving="isSaving"
        :error="activeSection === 'coveredContracts' ? saveError : null"
        @edit="startEditing('coveredContracts')"
        @save="saveCoveredContracts"
        @cancel="cancelEditing"
      >
        <template v-if="coveredAccountsWithScope.length > 0 && agreement.coveredContracts?.length > 0" #header-actions>
          <button
            type="button"
            class="expand-toggle"
            :title="contractsExpanded ? t('safeHarbor.collapseContracts') : t('safeHarbor.expandContracts')"
            @click="contractsExpanded = !contractsExpanded"
          >
            <ArrowsExpandIcon v-if="!contractsExpanded" class="icon" />
            <MinusSmIcon v-else class="icon" />
          </button>
        </template>
        <template #default>
          <div v-if="coveredAccountsWithScope.length > 0">
            <!-- Collapsed: truncated accounts with scope badges -->
            <div v-if="!contractsExpanded" class="covered-contracts-list">
              <AddressLink
                v-for="account in coveredAccountsWithScope"
                :key="account.accountAddress"
                :address="account.accountAddress"
                class="covered-contract-link"
                new-tab
              >
                <span class="contract-address">{{ shortValue(account.accountAddress) }}</span>
                <ExternalLinkIcon class="link-icon" />
                <Badge
                  v-if="account.childContractScope !== ChildContractScope.None"
                  size="sm"
                  :color="getChildScopeBadgeColor(account.childContractScope)"
                  :tooltip="getChildScopeTooltip(account.childContractScope)"
                >
                  {{ getChildScopeLabel(account.childContractScope) }}
                </Badge>
              </AddressLink>
            </div>
            <!-- Expanded: full addresses of all in-scope contracts -->
            <div v-else class="covered-contracts-list expanded">
              <AddressLink
                v-for="address in agreement.coveredContracts"
                :key="address"
                :address="address"
                class="covered-contract-link"
                new-tab
              >
                <span class="contract-address">{{ address }}</span>
                <ExternalLinkIcon class="link-icon" />
              </AddressLink>
            </div>
          </div>
          <div v-else class="no-contracts">
            {{ t("safeHarbor.noCoveredContracts") }}
          </div>
        </template>
        <template #edit-form>
          <CoveredContractsForm
            v-model="editForms.coveredContracts"
            :existing-contracts="coveredAccountsWithScope"
            :is-locked="isTermsLocked"
          />
        </template>
      </EditableSection>

      <!-- Legal Document Section (not editable during commitment window) -->
      <EditableSection
        v-if="agreement.agreementURI || isOwner"
        class="full-width"
        :title="t('safeHarbor.legalDocument')"
        :is-editing="activeSection === 'agreementURI'"
        :can-edit="isOwner && !isTermsLocked"
        :is-saving="isSaving"
        :error="activeSection === 'agreementURI' ? saveError : null"
        @edit="startEditing('agreementURI')"
        @save="saveAgreementURI"
        @cancel="cancelEditing"
      >
        <template #default>
          <div v-if="agreement.agreementURI" class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.agreementURI") }}</span>
            <a
              :href="agreementLink"
              target="_blank"
              rel="noopener noreferrer"
              class="detail-value link external agreement-uri"
              :title="agreement.agreementURI.length > 60 ? agreement.agreementURI : undefined"
            >
              {{ truncateMiddle(agreement.agreementURI, 60) }}
              <ExternalLinkIcon class="external-icon" />
            </a>
          </div>
          <div v-else class="no-uri">
            {{ t("safeHarbor.noAgreementURI") }}
          </div>
        </template>
        <template #edit-form>
          <div class="uri-form">
            <label class="form-label">{{ t("safeHarbor.agreementURI") }}</label>
            <input
              v-model="editForms.agreementURI"
              type="text"
              class="form-input"
              :placeholder="t('safeHarbor.edit.agreementURIPlaceholder')"
            />
            <span class="help-text">{{ t("safeHarbor.edit.agreementURIHelp") }}</span>
          </div>
        </template>
      </EditableSection>

      <!-- Timestamps Section (not editable) -->
      <div v-if="agreement.registeredAt || agreement.lastModified" class="details-section full-width">
        <h3 class="section-title">{{ t("safeHarbor.timestamps") }}</h3>
        <div class="section-content timestamps">
          <div v-if="agreement.registeredAt" class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.registeredAt") }}</span>
            <CopyButton :value="formattedRegisteredAt!" class="timestamp-copy">
              <TimeField :value="registeredAtISO" :format="TimeFormat.TIME_AGO_AND_FULL" />
            </CopyButton>
          </div>
          <div v-if="agreement.lastModified" class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.lastModified") }}</span>
            <CopyButton :value="formattedLastModified!" class="timestamp-copy">
              <TimeField :value="lastModifiedISO" :format="TimeFormat.TIME_AGO_AND_FULL" />
            </CopyButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Owner Edit Prompt - shows when not connected and not in readonly mode -->
    <div v-if="!walletAddress && !readonly" class="edit-prompt-banner">
      <PencilIcon class="icon" />
      <div class="prompt-content">
        <span class="prompt-text">
          {{ t("safeHarbor.edit.ownerPrompt") }}
          <button type="button" class="connect-link" @click="handleConnectWallet">
            {{ t("safeHarbor.edit.connectWallet") }}
          </button>
          {{ t("safeHarbor.edit.toEditTerms") }}
        </span>
        <span class="prompt-subtext">
          {{ t("safeHarbor.edit.commitmentWindowNote") }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { ArrowsExpandIcon, ClockIcon } from "@heroicons/vue/outline";
import {
  CheckIcon,
  ExclamationCircleIcon,
  ExternalLinkIcon,
  InformationCircleIcon,
  MinusSmIcon,
  PencilIcon,
  ShieldCheckIcon,
  XIcon,
} from "@heroicons/vue/solid";

import AddressLink from "@/components/AddressLink.vue";
import Badge from "@/components/common/Badge.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import Spinner from "@/components/common/Spinner.vue";
import TimeField from "@/components/common/table/fields/TimeField.vue";
import BountyTermsForm from "@/components/contract/BountyTermsForm.vue";
import CommitmentWindowStatus from "@/components/contract/CommitmentWindowStatus.vue";
import ContactsForm from "@/components/contract/ContactsForm.vue";
import CoveredContractsForm from "@/components/contract/CoveredContractsForm.vue";
import EditableSection from "@/components/contract/EditableSection.vue";

import useAgreementEditing, { type EditSection } from "@/composables/useAgreementEditing";
import useAttackModerator from "@/composables/useAttackModerator";

import type { BountyTermsFormData } from "@/components/contract/BountyTermsForm.vue";
import type { CoveredContractsChange } from "@/components/contract/CoveredContractsForm.vue";
import type { ContactDetail, CoveredAccount, SafeHarborAgreement } from "@/types";
import type { PropType } from "vue";

import { ChildContractScope, TimeFormat } from "@/types";
import { shortValue, truncateMiddle, truncateString } from "@/utils/formatters";
import { ISOStringFromUnixTimestamp, localDateFromUnixTimestamp } from "@/utils/helpers";
import { sanitizeHref } from "@/utils/validators";

const { t } = useI18n();

const props = defineProps({
  agreement: {
    type: Object as PropType<SafeHarborAgreement>,
    required: true,
  },
  owner: {
    type: String as PropType<string | null>,
    default: null,
  },
  walletAddress: {
    type: String as PropType<string | null>,
    default: null,
  },
  contractState: {
    type: String as PropType<string | null>,
    default: null,
  },
  /**
   * When true, disables all editing functionality and hides the owner prompt.
   * Used when displaying agreements in read-only contexts like the agreements list.
   */
  readonly: {
    type: Boolean,
    default: false,
  },
});

// State detection computed properties
const isRegistered = computed(() => props.contractState === "NEW_DEPLOYMENT");
const isPendingApproval = computed(() => props.contractState === "ATTACK_REQUESTED");
const isUnderAttack = computed(() => props.contractState === "UNDER_ATTACK");
const isPromotionPending = computed(() => props.contractState === "PROMOTION_REQUESTED");
const isProduction = computed(() => props.contractState === "PRODUCTION");
const isCorrupted = computed(() => props.contractState === "CORRUPTED");

// Show state banner for all states that have informational context
const showStateBanner = computed(
  () =>
    isRegistered.value ||
    isPendingApproval.value ||
    isUnderAttack.value ||
    isPromotionPending.value ||
    isProduction.value ||
    isCorrupted.value
);

// Banner styling based on state
const stateBannerClass = computed(() => ({
  "state-registered": isRegistered.value,
  "state-pending": isPendingApproval.value,
  "state-active": isUnderAttack.value,
  "state-promotion": isPromotionPending.value,
  "state-production": isProduction.value,
  "state-corrupted": isCorrupted.value,
}));

// Header styling based on state
const headerStateClass = computed(() => ({
  "state-registered": isRegistered.value,
  "state-pending": isPendingApproval.value,
  "state-active": isUnderAttack.value,
  "state-promotion": isPromotionPending.value,
  "state-production": isProduction.value,
  "state-corrupted": isCorrupted.value,
}));

// Banner icon based on state
const stateBannerIcon = computed(() => {
  if (isRegistered.value || isPendingApproval.value || isPromotionPending.value) return ClockIcon;
  if (isCorrupted.value) return ExclamationCircleIcon;
  return ShieldCheckIcon;
});

// Banner title based on state
const stateBannerTitle = computed(() => {
  if (isRegistered.value) return t("safeHarbor.stateMessages.registered.title");
  if (isPendingApproval.value) return t("safeHarbor.stateMessages.pendingApproval.title");
  if (isUnderAttack.value) return t("safeHarbor.stateMessages.active.title");
  if (isPromotionPending.value) return t("safeHarbor.stateMessages.promotionPending.title");
  if (isProduction.value) return t("safeHarbor.stateMessages.production.title");
  if (isCorrupted.value) return t("safeHarbor.stateMessages.corrupted.title");
  return "";
});

// Banner description based on state
const stateBannerDescription = computed(() => {
  if (isRegistered.value) return t("safeHarbor.stateMessages.registered.description");
  if (isPendingApproval.value) return t("safeHarbor.stateMessages.pendingApproval.description");
  if (isUnderAttack.value) return t("safeHarbor.stateMessages.active.description");
  if (isPromotionPending.value) return t("safeHarbor.stateMessages.promotionPending.description");
  if (isProduction.value) return t("safeHarbor.stateMessages.production.description");
  if (isCorrupted.value) return t("safeHarbor.stateMessages.corrupted.description");
  return "";
});

// Badge color based on state
const stateBadgeColor = computed((): "warning" | "success" | "neutral" | "error" => {
  if (isRegistered.value) return "neutral";
  if (isPendingApproval.value) return "warning";
  if (isUnderAttack.value) return "success";
  if (isPromotionPending.value) return "neutral";
  if (isProduction.value) return "neutral";
  if (isCorrupted.value) return "error";
  return "neutral";
});

const emit = defineEmits<{
  (e: "agreementUpdated"): void;
  (e: "connectWallet"): void;
  (e: "request-promotion"): void;
  (e: "cancel-promotion"): void;
}>();

// Ownership check (for editing agreement terms)
const isOwner = computed(() => {
  // In readonly mode, never show as owner (disables all edit functionality)
  if (props.readonly) return false;
  if (!props.owner || !props.walletAddress) return false;
  return props.owner.toLowerCase() === props.walletAddress.toLowerCase();
});

// Attack moderator check (for promote/cancel promotion actions)
const agreementAddressRef = computed(() => props.agreement.agreementAddress);
const walletAddressRef = computed(() => props.walletAddress);
const { isAttackModerator, isLoading: isAttackModeratorLoading } = useAttackModerator(
  agreementAddressRef,
  walletAddressRef
);

// Check if terms are currently locked (in commitment window)
const isTermsLocked = computed(() => {
  if (!props.agreement.commitmentDeadline) return false;
  return Date.now() < props.agreement.commitmentDeadline;
});

// Handle connect wallet request
const handleConnectWallet = () => {
  emit("connectWallet");
};

// Original bounty terms for comparison during locked state edits
const originalBountyTerms = computed(() => ({
  bountyPercentage: props.agreement.bountyPercentage || 10,
  bountyCapUsd: (props.agreement.bountyCapUsd || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  retainable: props.agreement.retainable || false,
  identityRequirement: props.agreement.identityRequirement || "Anonymous",
  diligenceRequirements: props.agreement.diligenceRequirements || "",
  aggregateBountyCapUsd: (props.agreement.aggregateBountyCapUsd || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ","),
}));

// Template ref for BountyTermsForm
const bountyTermsFormRef = ref<{ hasErrors: boolean } | null>(null);

// Check if bounty terms form is valid
const canSaveBountyTerms = computed(() => {
  return !bountyTermsFormRef.value?.hasErrors;
});

// Template ref for CommitmentWindowStatus (edit mode)
const commitmentWindowFormRef = ref<{ hasErrors: boolean } | null>(null);

// Edit state management
const {
  activeSection,
  isSaving,
  saveError,
  startEditing: startEditingSection,
  cancelEditing: cancelEditingSection,
  setProtocolName,
  setBountyTerms,
  setContactDetails,
  setAgreementURI,
  extendCommitmentWindow,
  addAccounts,
  removeAccounts,
} = useAgreementEditing(agreementAddressRef);

// State for commitment window extension
const newCommitmentDeadline = ref<number | null>(null);

// Check if commitment window extension is valid
const canSaveCommitmentWindow = computed(() => {
  return !commitmentWindowFormRef.value?.hasErrors;
});

// Cancel commitment window edit
const cancelCommitmentWindowEdit = () => {
  newCommitmentDeadline.value = null;
  cancelEditingSection();
};

// Save commitment window extension
const saveCommitmentWindow = async () => {
  if (!newCommitmentDeadline.value) return;
  const success = await extendCommitmentWindow(newCommitmentDeadline.value);
  if (success) {
    newCommitmentDeadline.value = null;
    emit("agreementUpdated");
  }
};

// Form state for edits
const editForms = reactive({
  protocolName: props.agreement.protocolName || "",
  bountyTerms: {
    bountyPercentage: props.agreement.bountyPercentage || 10,
    bountyCapUsd: props.agreement.bountyCapUsd || "0",
    retainable: props.agreement.retainable || false,
    identityRequirement: props.agreement.identityRequirement || "Anonymous",
    diligenceRequirements: props.agreement.diligenceRequirements || "",
    aggregateBountyCapUsd: props.agreement.aggregateBountyCapUsd || "0",
  } as BountyTermsFormData,
  contacts: [...(props.agreement.contactDetails || [])] as ContactDetail[],
  coveredContracts: { toAdd: [], toRemove: [] } as CoveredContractsChange,
  agreementURI: props.agreement.agreementURI || "",
});

// Reset form when agreement changes
watch(
  () => props.agreement,
  (newAgreement) => {
    editForms.protocolName = newAgreement.protocolName || "";
    editForms.bountyTerms = {
      bountyPercentage: newAgreement.bountyPercentage || 10,
      bountyCapUsd: newAgreement.bountyCapUsd || "0",
      retainable: newAgreement.retainable || false,
      identityRequirement: newAgreement.identityRequirement || "Anonymous",
      diligenceRequirements: newAgreement.diligenceRequirements || "",
      aggregateBountyCapUsd: newAgreement.aggregateBountyCapUsd || "0",
    };
    editForms.contacts = [...(newAgreement.contactDetails || [])];
    editForms.coveredContracts = { toAdd: [], toRemove: [] };
    editForms.agreementURI = newAgreement.agreementURI || "";
  },
  { deep: true }
);

const isEditingProtocolName = computed(() => activeSection.value === "protocolName");

const startEditing = (section: EditSection) => {
  // Reset form for the section being edited
  if (section === "bountyTerms") {
    editForms.bountyTerms = {
      bountyPercentage: props.agreement.bountyPercentage || 10,
      bountyCapUsd: props.agreement.bountyCapUsd || "0",
      retainable: props.agreement.retainable || false,
      identityRequirement: props.agreement.identityRequirement || "Anonymous",
      diligenceRequirements: props.agreement.diligenceRequirements || "",
      aggregateBountyCapUsd: props.agreement.aggregateBountyCapUsd || "0",
    };
  } else if (section === "contacts") {
    editForms.contacts = [...(props.agreement.contactDetails || [])];
  } else if (section === "coveredContracts") {
    editForms.coveredContracts = { toAdd: [], toRemove: [] };
  } else if (section === "agreementURI") {
    editForms.agreementURI = props.agreement.agreementURI || "";
  } else if (section === "commitmentWindow") {
    newCommitmentDeadline.value = null;
  }
  startEditingSection(section);
};

const startEditingProtocolName = () => {
  editForms.protocolName = props.agreement.protocolName || "";
  startEditingSection("protocolName");
};

const cancelEditing = () => {
  cancelEditingSection();
};

// Save functions
const saveProtocolName = async () => {
  const success = await setProtocolName(editForms.protocolName);
  if (success) {
    emit("agreementUpdated");
  }
};

const saveBountyTerms = async () => {
  // Convert form values to raw values for contract
  const terms = {
    ...editForms.bountyTerms,
    // Remove commas from formatted numbers
    bountyCapUsd: editForms.bountyTerms.bountyCapUsd.replace(/,/g, ""),
    aggregateBountyCapUsd: editForms.bountyTerms.aggregateBountyCapUsd.replace(/,/g, "") || "0",
  };
  const success = await setBountyTerms(terms);
  if (success) {
    emit("agreementUpdated");
  }
};

const saveContacts = async () => {
  const filteredContacts = editForms.contacts.filter((c) => c.name.trim() || c.contact.trim());
  const success = await setContactDetails(filteredContacts.length > 0 ? filteredContacts : editForms.contacts);
  if (success) {
    emit("agreementUpdated");
  }
};

const saveCoveredContracts = async () => {
  let success = true;

  // First remove contracts
  if (editForms.coveredContracts.toRemove.length > 0) {
    success = await removeAccounts(editForms.coveredContracts.toRemove);
  }

  // Then add new contracts with their child scope settings
  if (success && editForms.coveredContracts.toAdd.length > 0) {
    success = await addAccounts(editForms.coveredContracts.toAdd);
  }

  if (success) {
    editForms.coveredContracts = { toAdd: [], toRemove: [] };
    emit("agreementUpdated");
  }
};

const saveAgreementURI = async () => {
  const success = await setAgreementURI(editForms.agreementURI);
  if (success) {
    emit("agreementUpdated");
  }
};

// Computed values
const formattedBountyCap = computed(() => {
  const cap = Number(props.agreement.bountyCapUsd ?? 0);
  return cap.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
});

const formattedAggregateBountyCap = computed(() => {
  const cap = Number(props.agreement.aggregateBountyCapUsd ?? 0);
  return cap.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
});

const identityRequirementLabel = computed(() => {
  switch (props.agreement.identityRequirement) {
    case "Named":
      return t("safeHarbor.identityNamed");
    case "Pseudonymous":
      return t("safeHarbor.identityPseudonymous");
    case "Anonymous":
    default:
      return t("safeHarbor.anonymousAllowed");
  }
});

const agreementLink = computed(() => {
  const uri = props.agreement.agreementURI;
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  if (uri.startsWith("ar://")) {
    return `https://arweave.net/${uri.slice(5)}`;
  }
  return sanitizeHref(uri);
});

// Contact helpers
const isEmailContact = (contact: string): boolean => {
  return contact.includes("@") && !contact.startsWith("@") && contact.includes(".");
};

const isLinkableContact = (contact: string): boolean => {
  const lowerContact = contact.toLowerCase();
  return (
    lowerContact.startsWith("http") ||
    lowerContact.startsWith("@") ||
    lowerContact.includes("discord") ||
    lowerContact.includes("t.me") ||
    lowerContact.includes("telegram")
  );
};

const formatContactLink = (contact: ContactDetail): string => {
  const value = contact.contact;
  const nameLower = contact.name.toLowerCase();

  if (value.startsWith("http")) {
    return sanitizeHref(value);
  }

  if (value.startsWith("@") || nameLower.includes("telegram")) {
    const handle = value.startsWith("@") ? value.slice(1) : value;
    return `https://t.me/${handle}`;
  }

  if (nameLower.includes("discord") || value.includes("discord.gg")) {
    if (value.startsWith("discord.gg")) {
      return `https://${value}`;
    }
    return `https://discord.gg/${value}`;
  }

  return sanitizeHref(value);
};

const formatTimestamp = (timestamp: number | null): string | null => {
  if (!timestamp) return null;
  return localDateFromUnixTimestamp(Math.floor(timestamp / 1000));
};

const toISOString = (timestamp: number | null): string => {
  if (!timestamp) return "";
  return ISOStringFromUnixTimestamp(Math.floor(timestamp / 1000));
};

const formattedRegisteredAt = computed(() => formatTimestamp(props.agreement.registeredAt));
const formattedLastModified = computed(() => formatTimestamp(props.agreement.lastModified));
const registeredAtISO = computed(() => toISOString(props.agreement.registeredAt));
const lastModifiedISO = computed(() => toISOString(props.agreement.lastModified));

// Covered accounts with scope info
// Falls back to coveredContracts with scope=None if coveredAccounts not available
const coveredAccountsWithScope = computed((): CoveredAccount[] => {
  if (props.agreement.coveredAccounts?.length) {
    return props.agreement.coveredAccounts;
  }
  // Fallback: convert coveredContracts to accounts with None scope
  return (props.agreement.coveredContracts || []).map((addr) => ({
    accountAddress: addr,
    childContractScope: ChildContractScope.None,
  }));
});

// Value at Risk band color
const valueBandColor = computed((): "neutral" | "success" | "warning" | "accent" => {
  switch (props.agreement.valueBand) {
    case "$10M+":
    case "$1M - $10M":
      return "accent";
    case "$100K - $1M":
      return "success";
    case "$10K - $100K":
      return "warning";
    default:
      return "neutral";
  }
});

const contractsExpanded = ref(false);

// Scope label helper
const getChildScopeLabel = (scope: number): string => {
  const scopeMap: Record<number, string> = {
    [ChildContractScope.None]: t("safeHarbor.childScope.none"),
    [ChildContractScope.ExistingOnly]: t("safeHarbor.childScope.existingOnly"),
    [ChildContractScope.All]: t("safeHarbor.childScope.all"),
    [ChildContractScope.FutureOnly]: t("safeHarbor.childScope.futureOnly"),
  };
  return scopeMap[scope] ?? scopeMap[ChildContractScope.None];
};

// Badge color based on scope - use neutral for consistency with parent component
const getChildScopeBadgeColor = (_scope: number): "neutral" | "success" | "accent" => {
  return "neutral";
};

// Tooltip with fuller explanation
const getChildScopeTooltip = (scope: number): string => {
  const tooltips: Record<number, string> = {
    [ChildContractScope.ExistingOnly]: t("safeHarbor.childScope.existingOnlyTooltip"),
    [ChildContractScope.All]: t("safeHarbor.childScope.allTooltip"),
    [ChildContractScope.FutureOnly]: t("safeHarbor.childScope.futureOnlyTooltip"),
  };
  return tooltips[scope] ?? "";
};
</script>

<style scoped lang="scss">
.agreement-details {
  @apply space-y-4 sm:space-y-6;

  // Combined Header Card
  .agreement-header-card {
    @apply rounded-lg border p-4;
    border-color: var(--border-default);
    background-color: var(--bg-secondary);

    .header-main {
      @apply flex items-start gap-3 sm:items-center sm:gap-4;
    }

    .header-icon {
      @apply shrink-0;

      .icon {
        @apply h-8 w-8 sm:h-10 sm:w-10;
      }
    }

    .header-content {
      @apply flex min-w-0 flex-1 flex-col gap-1;
    }

    .header-name-row {
      @apply flex flex-wrap items-center gap-2;
    }

    .protocol-name {
      @apply mb-0 truncate text-lg font-semibold sm:text-xl;
      max-width: 200px;

      @media (min-width: 640px) {
        max-width: 300px;
      }
    }

    .state-description {
      @apply mt-3 border-t pt-3 text-sm leading-relaxed;
      border-color: var(--border-subtle);
      color: var(--text-secondary);
    }

    .request-promotion-button {
      @apply mt-3 rounded-md px-4 py-2 text-sm font-medium;
      background-color: var(--accent);
      color: white;

      &:hover {
        background-color: var(--accent-hover);
      }
    }

    .cancel-promotion-button {
      @apply mt-3 rounded-md border px-4 py-2 text-sm font-medium;
      border-color: var(--border-default);
      background-color: transparent;
      color: var(--text-secondary);

      &:hover {
        background-color: var(--bg-tertiary);
        color: var(--text-primary);
      }
    }

    .header-meta {
      @apply mt-3 border-t pt-3;
      border-color: var(--border-subtle);
    }

    .commitment-section-inline {
      @apply w-full sm:w-fit;

      :deep(.section-title) {
        @apply mb-1;
      }
    }

    .value-at-risk-inline + .commitment-section-inline {
      @apply mt-3;
    }

    .value-at-risk-inline {
      .meta-label {
        @apply text-xs font-semibold uppercase tracking-wide mb-1.5;
        color: var(--text-muted);
      }

      .value-band-row {
        @apply flex items-center gap-2 mb-1;
      }

      .confidence-icon {
        @apply w-3 h-3;
      }

      .confidence-label {
        @apply text-xs;
        color: var(--text-muted);
      }

      .value-detail {
        @apply text-sm;
        color: var(--text-secondary);

        &.muted {
          @apply text-xs;
          color: var(--text-muted);
        }
      }

      .token-breakdown {
        @apply mt-1.5 text-sm max-w-48;

        .token-line {
          @apply flex items-center gap-2 py-0.5;

          .token-symbol {
            @apply font-medium text-xs shrink-0;
            color: var(--text-secondary);
          }

          .token-separator {
            @apply flex-1 border-b border-dotted;
            border-color: var(--border-subtle);
            min-width: 1rem;
          }

          .token-usd {
            @apply text-xs tabular-nums shrink-0;
            color: var(--text-muted);
          }
        }

        &.unpriced {
          @apply text-xs mt-1;
          color: var(--warning-text);

          .unpriced-label {
            @apply font-medium;
          }

          .unpriced-tokens {
            @apply ml-1;
          }
        }
      }
    }

    // State-specific styling
    &.state-registered {
      border-color: var(--info-border, var(--border-default));
      background-color: var(--info-bg, var(--bg-secondary));

      .header-icon .icon {
        color: var(--info, #3b82f6);
      }

      .protocol-name {
        color: var(--info-text);
      }
    }

    &.state-pending {
      border-color: var(--warning-border, var(--border-default));
      background-color: var(--warning-bg, var(--bg-secondary));

      .header-icon .icon {
        color: var(--warning, #f59e0b);
      }

      .protocol-name {
        color: var(--warning-text);
      }
    }

    &.state-active {
      border-color: var(--success-border, var(--border-default));
      background-color: var(--success-bg, var(--bg-secondary));

      .header-icon .icon {
        color: var(--success);
      }

      .protocol-name {
        color: var(--success-text);
      }
    }

    &.state-promotion {
      border-color: var(--info-border, var(--border-default));
      background-color: var(--info-bg, var(--bg-secondary));

      .header-icon .icon {
        color: var(--info, #3b82f6);
      }

      .protocol-name {
        color: var(--info-text);
      }
    }

    &.state-production {
      border-color: var(--border-default);
      background-color: var(--bg-secondary);

      .header-icon .icon {
        color: var(--accent);
      }

      .protocol-name {
        color: var(--accent-text);
      }
    }

    &.state-corrupted {
      border-color: var(--error-border, var(--border-default));
      background-color: var(--error-bg, var(--bg-secondary));

      .header-icon .icon {
        color: var(--error);
      }

      .protocol-name {
        color: var(--error-text);
      }
    }
  }

  .protocol-name-input {
    @apply flex-1 rounded-md border px-3 py-1 text-lg font-semibold sm:text-xl;
    border-color: var(--border-default);
    background-color: var(--bg-primary);
    color: var(--text-primary);
    max-width: 300px;

    &:focus {
      @apply outline-none ring-2 ring-offset-0;
      --tw-ring-color: var(--accent);
    }
  }

  .btn-inline-edit,
  .btn-inline-save,
  .btn-inline-cancel {
    @apply inline-flex shrink-0 items-center justify-center rounded p-1 transition-colors;
  }

  .btn-inline-edit {
    color: var(--text-muted);

    &:hover {
      color: var(--accent);
      background-color: var(--bg-tertiary);
    }

    .icon {
      @apply h-4 w-4;
    }
  }

  .btn-inline-save {
    background-color: var(--success);
    color: white;

    &:hover:not(:disabled) {
      opacity: 0.9;
    }

    &:disabled {
      @apply cursor-not-allowed opacity-60;
    }

    .icon {
      @apply h-4 w-4;
    }
  }

  .btn-inline-cancel {
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

  .header-error {
    @apply mt-1 text-xs;
    color: var(--error-text);
  }

  .agreement-address {
    @apply flex flex-wrap items-center gap-2 text-xs;
    color: var(--text-muted);

    .address-label {
      color: var(--text-muted);
    }

    .address-link {
      @apply inline-flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors;
      background-color: var(--bg-tertiary);
      color: var(--accent);

      &:hover {
        background-color: var(--bg-hover);
        text-decoration: underline;
      }

      .address-value {
        @apply font-mono;
      }

      .link-icon {
        @apply h-3 w-3 shrink-0 opacity-60;
      }
    }
  }

  .edit-prompt-banner {
    @apply flex items-start gap-3 rounded-lg border p-3 sm:items-center sm:p-4;
    border-color: var(--border-default);
    background-color: var(--bg-secondary);

    > .icon {
      @apply h-5 w-5 shrink-0;
      color: var(--text-muted);
    }

    .prompt-content {
      @apply flex flex-col gap-1;
    }

    .prompt-text {
      @apply text-sm;
      color: var(--text-secondary);
    }

    .prompt-subtext {
      @apply text-xs;
      color: var(--text-muted);
    }

    .connect-link {
      @apply font-medium underline;
      color: var(--accent);

      &:hover {
        color: var(--accent-hover);
      }
    }
  }

  .restriction-banner {
    @apply flex items-start gap-2 rounded-lg p-3 text-sm sm:items-center sm:p-4;
    background-color: var(--info-muted);
    color: var(--info-text);

    > .icon {
      @apply h-5 w-5 shrink-0;
    }
  }

  .details-grid {
    @apply grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2;
  }

  .details-section {
    @apply rounded-lg border p-3 sm:p-4;
    border-color: var(--border-default);
    background-color: var(--bg-primary);

    &.full-width {
      @apply md:col-span-2;
    }
  }

  .section-title {
    @apply mb-2 border-b pb-2 text-sm font-semibold sm:mb-3;
    border-color: var(--border-subtle);
    color: var(--text-secondary);
  }

  .section-content {
    @apply space-y-2;

    &.timestamps {
      @apply flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6;

      .detail-row {
        @apply sm:flex-1;
      }
    }
  }

  .detail-row {
    @apply flex flex-col gap-0.5;
  }

  .detail-label {
    @apply text-xs;
    color: var(--text-muted);
  }

  .detail-value {
    @apply break-all text-sm;
    color: var(--text-secondary);

    &.highlight {
      @apply text-lg font-bold;
      color: var(--success-text);
    }

    &.allowed {
      @apply font-medium;
      color: var(--success-text);
    }

    &.not-allowed {
      @apply font-medium;
      color: var(--error-text);
    }

    &.link {
      @apply break-all;
      color: var(--accent);
      &:hover {
        @apply underline;
      }

      &.external {
        @apply inline-flex flex-wrap items-center gap-1;
      }
    }
  }

  .external-icon {
    @apply h-3.5 w-3.5 shrink-0;
  }

  .no-contacts,
  .no-contracts,
  .no-uri {
    @apply text-sm italic;
    color: var(--text-muted);
  }

  .covered-contracts-list {
    @apply flex flex-wrap gap-2;

    &.expanded {
      @apply overflow-y-auto;
      max-height: 400px;
    }
  }

  .expand-toggle {
    @apply flex items-center justify-center h-6 w-6 rounded border-0 cursor-pointer p-0;
    background-color: var(--bg-tertiary);
    color: var(--text-muted);

    &:hover {
      background-color: var(--bg-hover);
      color: var(--text-primary);
    }

    .icon {
      @apply h-3.5 w-3.5;
    }
  }

  .covered-contract-link {
    @apply inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors sm:text-sm;
    background-color: var(--bg-tertiary);
    color: var(--accent);

    &:hover {
      background-color: var(--bg-hover);
      text-decoration: underline;
    }

    .contract-address {
      @apply font-mono;
    }

    .link-icon {
      @apply h-3 w-3 shrink-0 opacity-60;
    }
  }

  :deep(.timestamp-copy.copy-button-container) {
    @apply h-auto w-auto;

    .copy-button {
      @apply static p-0 focus:ring-0;
    }
  }

  // Form styles for inline URI editing
  .uri-form {
    @apply space-y-2;
  }

  .form-label {
    @apply block text-xs font-medium;
    color: var(--text-muted);
  }

  .form-input {
    @apply w-full rounded-md border px-3 py-2 text-sm;
    border-color: var(--border-default);
    background-color: var(--bg-primary);
    color: var(--text-primary);

    &:focus {
      @apply outline-none ring-2;
      ring-color: var(--accent);
      border-color: var(--accent);
    }
  }

  .help-text {
    @apply text-xs;
    color: var(--text-muted);
  }

  // EditableSection full-width override
  :deep(.editable-section.full-width) {
    @apply md:col-span-2;
  }

  .full-width {
    @apply md:col-span-2;
  }
}
</style>
