<template>
  <div class="agreement-details">
    <!-- Header -->
    <div class="agreement-header">
      <div class="header-icon">
        <ShieldCheckIcon class="icon" />
      </div>
      <div class="header-content">
        <h2 class="protocol-name">{{ agreement.protocolName || t("safeHarbor.defaultProtocolName") }}</h2>
        <span class="agreement-address">
          {{ t("safeHarbor.agreementContract") }}:
          <AddressLink :address="agreement.agreementAddress">
            {{ shortValue(agreement.agreementAddress) }}
          </AddressLink>
        </span>
      </div>
    </div>

    <!-- Commitment Window Status -->
    <CommitmentWindowStatus :deadline="agreement.commitmentDeadline" class="commitment-status" />

    <!-- Details Grid -->
    <div class="details-grid">
      <!-- Bounty Terms Section -->
      <div class="details-section">
        <h3 class="section-title">{{ t("safeHarbor.bountyTerms") }}</h3>
        <div class="section-content">
          <div class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.bountyPercentage") }}</span>
            <span class="detail-value highlight">{{ agreement.bountyPercentage }}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.bountyCap") }}</span>
            <span class="detail-value">{{ formattedBountyCap }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.anonymousWhitehats") }}</span>
            <span class="detail-value" :class="allowsAnonymous ? 'allowed' : 'not-allowed'">
              {{ allowsAnonymous ? t("safeHarbor.allowed") : t("safeHarbor.notAllowed") }}
            </span>
          </div>
          <div v-if="agreement.retainable !== undefined" class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.retainable") }}</span>
            <span class="detail-value" :class="agreement.retainable ? 'allowed' : 'not-allowed'">
              {{ agreement.retainable ? t("safeHarbor.yes") : t("safeHarbor.no") }}
            </span>
          </div>
        </div>
      </div>

      <!-- Contact Information Section -->
      <div class="details-section">
        <h3 class="section-title">{{ t("safeHarbor.contactInfo") }}</h3>
        <div class="section-content">
          <template v-if="agreement.contactDetails && agreement.contactDetails.length > 0">
            <div v-for="(contact, index) in agreement.contactDetails" :key="index" class="detail-row">
              <span class="detail-label">{{ contact.name }}</span>
              <a v-if="isEmailContact(contact.contact)" :href="`mailto:${contact.contact}`" class="detail-value link">
                {{ contact.contact }}
              </a>
              <a
                v-else-if="isLinkableContact(contact.contact)"
                :href="formatContactLink(contact)"
                target="_blank"
                rel="noopener noreferrer"
                class="detail-value link"
              >
                {{ contact.contact }}
              </a>
              <span v-else class="detail-value">{{ contact.contact }}</span>
            </div>
          </template>
          <div v-else class="no-contacts">
            {{ t("safeHarbor.noContactInfo") }}
          </div>
        </div>
      </div>

      <!-- Covered Contracts Section -->
      <div
        v-if="agreement.coveredContracts && agreement.coveredContracts.length > 0"
        class="details-section full-width"
      >
        <h3 class="section-title">{{ t("safeHarbor.coveredContracts") }}</h3>
        <div class="section-content">
          <div class="covered-contracts-list">
            <div v-for="contractAddr in agreement.coveredContracts" :key="contractAddr" class="covered-contract">
              <AddressLink :address="contractAddr">
                {{ shortValue(contractAddr) }}
              </AddressLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Legal Document Section -->
      <div v-if="agreement.agreementURI" class="details-section full-width">
        <h3 class="section-title">{{ t("safeHarbor.legalDocument") }}</h3>
        <div class="section-content">
          <div class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.agreementURI") }}</span>
            <a :href="agreementLink" target="_blank" rel="noopener noreferrer" class="detail-value link external">
              {{ agreement.agreementURI }}
              <ExternalLinkIcon class="external-icon" />
            </a>
          </div>
        </div>
      </div>

      <!-- Timestamps Section -->
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
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { ExternalLinkIcon, ShieldCheckIcon } from "@heroicons/vue/solid";

import AddressLink from "@/components/AddressLink.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import TimeField from "@/components/common/table/fields/TimeField.vue";
import CommitmentWindowStatus from "@/components/contract/CommitmentWindowStatus.vue";

import type { ContactDetail, SafeHarborAgreement } from "@/types";
import type { PropType } from "vue";

import { TimeFormat } from "@/types";
import { shortValue } from "@/utils/formatters";
import { ISOStringFromUnixTimestamp, localDateFromUnixTimestamp } from "@/utils/helpers";

const { t } = useI18n();

const props = defineProps({
  agreement: {
    type: Object as PropType<SafeHarborAgreement>,
    required: true,
  },
});

const formattedBountyCap = computed(() => {
  // bountyCapUsd is stored as a string from the API (could be bigint)
  const cap = Number(props.agreement.bountyCapUsd ?? 0);
  return cap.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
});

// Anonymous whitehats are allowed if identityRequirement is "Anonymous" or not set
const allowsAnonymous = computed(() => {
  return props.agreement.identityRequirement === "Anonymous" || props.agreement.identityRequirement === undefined;
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
  return uri;
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

  // Already a full URL
  if (value.startsWith("http")) {
    return value;
  }

  // Telegram handle
  if (value.startsWith("@") || nameLower.includes("telegram")) {
    const handle = value.startsWith("@") ? value.slice(1) : value;
    return `https://t.me/${handle}`;
  }

  // Discord
  if (nameLower.includes("discord") || value.includes("discord.gg")) {
    if (value.startsWith("discord.gg")) {
      return `https://${value}`;
    }
    return `https://discord.gg/${value}`;
  }

  // Default: return as-is (may not be linkable)
  return value;
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
</script>

<style scoped lang="scss">
.agreement-details {
  @apply space-y-4 sm:space-y-6;

  .agreement-header {
    @apply flex items-start gap-3 rounded-lg p-3 sm:items-center sm:gap-4 sm:p-4;
    background-color: var(--success-muted);
  }

  .header-icon {
    @apply flex-shrink-0;

    .icon {
      @apply h-8 w-8 sm:h-10 sm:w-10;
      color: var(--success);
    }
  }

  .header-content {
    @apply flex min-w-0 flex-col gap-1;
  }

  .protocol-name {
    @apply text-lg font-semibold sm:text-xl;
    color: var(--success-text);
  }

  .agreement-address {
    @apply flex flex-wrap items-center gap-1 text-xs;
    color: var(--text-muted);

    a {
      color: var(--accent);
      &:hover {
        @apply underline;
      }
    }
  }

  .commitment-status {
    @apply w-full sm:w-fit;
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
    @apply h-3.5 w-3.5 flex-shrink-0;
  }

  .no-contacts {
    @apply text-sm italic;
    color: var(--text-muted);
  }

  .covered-contracts-list {
    @apply flex flex-wrap gap-2;
  }

  .covered-contract {
    @apply rounded-md px-2 py-1 text-xs sm:text-sm;
    background-color: var(--bg-tertiary);

    // Truncate long addresses on mobile
    :deep(a) {
      @apply block truncate;
    }
  }

  :deep(.timestamp-copy.copy-button-container) {
    @apply h-auto w-auto;

    .copy-button {
      @apply static p-0 focus:ring-0;
    }
  }
}
</style>
