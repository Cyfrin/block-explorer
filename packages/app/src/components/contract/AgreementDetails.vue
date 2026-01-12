<template>
  <div class="agreement-details">
    <!-- Header -->
    <div class="agreement-header">
      <div class="header-icon">
        <ShieldCheckIcon class="icon" />
      </div>
      <div class="header-content">
        <h2 class="protocol-name">{{ agreement.protocolName }}</h2>
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
            <span class="detail-value" :class="agreement.allowAnonymous ? 'allowed' : 'not-allowed'">
              {{ agreement.allowAnonymous ? t("safeHarbor.allowed") : t("safeHarbor.notAllowed") }}
            </span>
          </div>
        </div>
      </div>

      <!-- Contact Information Section -->
      <div class="details-section">
        <h3 class="section-title">{{ t("safeHarbor.contactInfo") }}</h3>
        <div class="section-content">
          <div v-if="agreement.contactEmail" class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.email") }}</span>
            <a :href="`mailto:${agreement.contactEmail}`" class="detail-value link">
              {{ agreement.contactEmail }}
            </a>
          </div>
          <div v-if="agreement.contactDiscord" class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.discord") }}</span>
            <a :href="discordLink" target="_blank" rel="noopener noreferrer" class="detail-value link">
              {{ agreement.contactDiscord }}
            </a>
          </div>
          <div v-if="agreement.contactTelegram" class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.telegram") }}</span>
            <a :href="telegramLink" target="_blank" rel="noopener noreferrer" class="detail-value link">
              {{ agreement.contactTelegram }}
            </a>
          </div>
          <div
            v-if="!agreement.contactEmail && !agreement.contactDiscord && !agreement.contactTelegram"
            class="no-contacts"
          >
            {{ t("safeHarbor.noContactInfo") }}
          </div>
        </div>
      </div>

      <!-- Asset Recovery Section -->
      <div class="details-section">
        <h3 class="section-title">{{ t("safeHarbor.assetRecovery") }}</h3>
        <div class="section-content">
          <div class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.recoveryAddress") }}</span>
            <AddressLink :address="agreement.assetRecoveryAddress" class="detail-value">
              {{ shortValue(agreement.assetRecoveryAddress) }}
            </AddressLink>
          </div>
        </div>
      </div>

      <!-- Covered Contracts Section -->
      <div class="details-section full-width">
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
      <div class="details-section full-width">
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
      <div class="details-section full-width">
        <h3 class="section-title">{{ t("safeHarbor.timestamps") }}</h3>
        <div class="section-content timestamps">
          <div class="detail-row">
            <span class="detail-label">{{ t("safeHarbor.registeredAt") }}</span>
            <CopyButton :value="formattedRegisteredAt!" class="timestamp-copy">
              <TimeField :value="registeredAtISO" :format="TimeFormat.TIME_AGO_AND_FULL" />
            </CopyButton>
          </div>
          <div class="detail-row">
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

import type { SafeHarborAgreement } from "@/types";
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
  const cap = Number(props.agreement.bountyCap) / 1e6;
  if (cap >= 1_000_000) {
    return `$${(cap / 1_000_000).toFixed(0)}M`;
  } else if (cap >= 1_000) {
    return `$${(cap / 1_000).toFixed(0)}K`;
  }
  return `$${cap.toFixed(0)}`;
});

const agreementLink = computed(() => {
  const uri = props.agreement.agreementURI;
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  if (uri.startsWith("ar://")) {
    return `https://arweave.net/${uri.slice(5)}`;
  }
  return uri;
});

const discordLink = computed(() => {
  const discord = props.agreement.contactDiscord;
  if (!discord) return "";
  // If it's already a full URL or discord.gg link, use as-is
  if (discord.startsWith("http") || discord.startsWith("discord.gg")) {
    return discord.startsWith("http") ? discord : `https://${discord}`;
  }
  // Otherwise assume it's an invite code
  return `https://discord.gg/${discord}`;
});

const telegramLink = computed(() => {
  const telegram = props.agreement.contactTelegram;
  if (!telegram) return "";
  // Remove @ prefix if present
  const handle = telegram.startsWith("@") ? telegram.slice(1) : telegram;
  return `https://t.me/${handle}`;
});

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
    @apply flex items-start gap-3 rounded-lg bg-success-50 p-3 sm:items-center sm:gap-4 sm:p-4;
  }

  .header-icon {
    @apply flex-shrink-0;

    .icon {
      @apply h-8 w-8 text-success-500 sm:h-10 sm:w-10;
    }
  }

  .header-content {
    @apply flex min-w-0 flex-col gap-1;
  }

  .protocol-name {
    @apply text-lg font-semibold text-success-700 sm:text-xl;
  }

  .agreement-address {
    @apply flex flex-wrap items-center gap-1 text-xs text-neutral-500;

    a {
      @apply text-primary-600 hover:underline;
    }
  }

  .commitment-status {
    @apply w-full sm:w-fit;
  }

  .details-grid {
    @apply grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2;
  }

  .details-section {
    @apply rounded-lg border border-neutral-200 bg-white p-3 sm:p-4;

    &.full-width {
      @apply md:col-span-2;
    }
  }

  .section-title {
    @apply mb-2 border-b border-neutral-100 pb-2 text-sm font-semibold text-neutral-700 sm:mb-3;
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
    @apply text-xs text-neutral-400;
  }

  .detail-value {
    @apply break-all text-sm text-neutral-700;

    &.highlight {
      @apply text-lg font-bold text-success-600;
    }

    &.allowed {
      @apply font-medium text-success-600;
    }

    &.not-allowed {
      @apply font-medium text-error-600;
    }

    &.link {
      @apply break-all text-primary-600 hover:underline;

      &.external {
        @apply inline-flex flex-wrap items-center gap-1;
      }
    }
  }

  .external-icon {
    @apply h-3.5 w-3.5 flex-shrink-0;
  }

  .no-contacts {
    @apply text-sm italic text-neutral-400;
  }

  .covered-contracts-list {
    @apply flex flex-wrap gap-2;
  }

  .covered-contract {
    @apply rounded-md bg-neutral-100 px-2 py-1 text-xs sm:text-sm;

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
