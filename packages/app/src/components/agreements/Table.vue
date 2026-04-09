<template>
  <Table class="agreements-table" :class="{ loading }" :items="agreements" :loading="loading">
    <template v-if="agreements?.length || loading" #table-head>
      <TableHeadColumn class="expand-column"></TableHeadColumn>
      <TableHeadColumn class="sortable-column" @click="toggleSort('protocolName')">
        <span class="column-header">
          {{ t("agreementsView.table.protocolName") }}
          <SortIcon :direction="getSortDirection('protocolName')" />
        </span>
      </TableHeadColumn>
      <TableHeadColumn class="sortable-column" @click="toggleSort('state')">
        <span class="column-header">
          {{ t("agreementsView.table.state") }}
          <SortIcon :direction="getSortDirection('state')" />
        </span>
      </TableHeadColumn>
      <TableHeadColumn class="sortable-column text-right" @click="toggleSort('bountyPercentage')">
        <span class="column-header justify-end">
          {{ t("agreementsView.table.bountyPercentage") }}
          <SortIcon :direction="getSortDirection('bountyPercentage')" />
        </span>
      </TableHeadColumn>
      <TableHeadColumn class="sortable-column text-right" @click="toggleSort('bountyCapUsd')">
        <span class="column-header justify-end">
          {{ t("agreementsView.table.bountyCapUsd") }}
          <SortIcon :direction="getSortDirection('bountyCapUsd')" />
        </span>
      </TableHeadColumn>
      <TableHeadColumn class="sortable-column" @click="toggleSort('valuePricedUsd')">
        <span class="column-header">
          {{ t("agreementsView.table.estValue") }}
          <SortIcon :direction="getSortDirection('valuePricedUsd')" />
        </span>
      </TableHeadColumn>
      <TableHeadColumn class="sortable-column" @click="toggleSort('createdAt')">
        <span class="column-header">
          {{ t("agreementsView.table.createdAt") }}
          <SortIcon :direction="getSortDirection('createdAt')" />
        </span>
      </TableHeadColumn>
    </template>
    <template #loading>
      <tr class="loader-row" v-for="item in loadingRows" :key="item">
        <TableBodyColumn class="expand-column">
          <ContentLoader class="h-4 w-4" />
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader class="h-4 w-24" />
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader class="h-5 w-20" />
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader class="h-4 w-12" />
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader class="h-4 w-16" />
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader class="h-5 w-20" />
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader class="h-4 w-24" />
        </TableBodyColumn>
      </tr>
    </template>
    <!-- Manual row rendering to support expandable rows -->
    <template v-for="item in agreements" :key="item.agreementAddress">
      <tr class="table-row clickable-row" @click="toggleRow(item.agreementAddress)">
        <TableBodyColumn class="expand-column">
          <ChevronDownIcon v-if="expandedRows.has(item.agreementAddress)" class="expand-icon" />
          <ChevronRightIcon v-else class="expand-icon" />
        </TableBodyColumn>
        <TableBodyColumn :data-heading="t('agreementsView.table.protocolName')">
          <ContentLoader v-if="isDetailsPending(item)" class="h-4 w-24" />
          <span v-else class="protocol-name">{{ item.protocolName || "-" }}</span>
        </TableBodyColumn>
        <TableBodyColumn :data-heading="t('agreementsView.table.state')">
          <Badge :color="getStateColor(item.state)" :tooltip="getStateTooltip(item.state)">
            {{ getStateLabel(item.state) }}
          </Badge>
        </TableBodyColumn>
        <TableBodyColumn :data-heading="t('agreementsView.table.bountyPercentage')" class="text-right tabular-nums">
          <ContentLoader v-if="isDetailsPending(item)" class="h-4 w-12" />
          <span v-else>{{ item.bountyPercentage != null ? `${item.bountyPercentage}%` : "-" }}</span>
        </TableBodyColumn>
        <TableBodyColumn :data-heading="t('agreementsView.table.bountyCapUsd')" class="text-right tabular-nums">
          <ContentLoader v-if="isDetailsPending(item)" class="h-4 w-16" />
          <span v-else>{{ formatBountyCap(item.bountyCapUsd) }}</span>
        </TableBodyColumn>
        <TableBodyColumn :data-heading="t('agreementsView.table.estValue')" class="est-value-column">
          <Badge v-if="item.valueBand" :color="getBandColor(item.valueBand)" :tooltip="getValueTooltip(item)">
            <template #icon>
              <svg viewBox="0 0 10 10" class="confidence-icon">
                <circle v-if="item.valueConfidence === 'HIGH'" cx="5" cy="5" r="4" fill="currentColor" />
                <template v-else-if="item.valueConfidence === 'MEDIUM'">
                  <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1" />
                  <path d="M5 1 A4 4 0 0 1 5 9 Z" fill="currentColor" />
                </template>
                <circle v-else cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" stroke-width="1" />
              </svg>
            </template>
            {{ item.valueBand }}
          </Badge>
          <span v-else class="text-muted">-</span>
        </TableBodyColumn>
        <TableBodyColumn :data-heading="t('agreementsView.table.createdAt')" class="created-column">
          <CopyButton v-if="item.createdAt" :value="new Date(item.createdAt).toISOString()" @click.stop>
            <TimeField :value="new Date(item.createdAt).toISOString()" :format="TimeFormat.TIME_AGO" />
          </CopyButton>
          <span v-else>-</span>
        </TableBodyColumn>
      </tr>
      <tr v-if="expandedRows.has(item.agreementAddress)" class="expanded-row">
        <td :colspan="7" class="expanded-content">
          <AgreementDetails :agreement="toSafeHarborAgreement(item)" :contract-state="item.state" readonly />
        </td>
      </tr>
    </template>
    <template #empty>
      <TableBodyColumn class="agreements-not-found" :colspan="7">
        <slot name="not-found">{{ t("agreementsView.table.noAgreements") }}</slot>
      </TableBodyColumn>
    </template>
    <template v-if="agreements?.length" #footer>
      <Pagination
        :active-page="activePage"
        :use-query="true"
        :total-items="total"
        :page-size="pageSize"
        :disabled="loading"
      />
    </template>
  </Table>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/vue/solid";

import SortIcon from "@/components/agreements/SortIcon.vue";
import Badge from "@/components/common/Badge.vue";
import CopyButton from "@/components/common/CopyButton.vue";
import Pagination from "@/components/common/Pagination.vue";
import ContentLoader from "@/components/common/loaders/ContentLoader.vue";
import Table from "@/components/common/table/Table.vue";
import TableBodyColumn from "@/components/common/table/TableBodyColumn.vue";
import TableHeadColumn from "@/components/common/table/TableHeadColumn.vue";
import TimeField from "@/components/common/table/fields/TimeField.vue";
import AgreementDetails from "@/components/contract/AgreementDetails.vue";

import type { AgreementListItem, SortDirection, SortKey } from "@/composables/useAgreements";
import type { SafeHarborAgreement } from "@/types";
import type { PropType } from "vue";

import { ContractState, TimeFormat } from "@/types";

const { t } = useI18n();
const route = useRoute();

const props = defineProps({
  agreements: {
    type: Array as PropType<AgreementListItem[]>,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: true,
  },
  loadingRows: {
    type: Number,
    default: 10,
  },
  total: {
    type: Number,
    default: 0,
  },
  pageSize: {
    type: Number,
    default: 10,
  },
  sortKey: {
    type: String as PropType<SortKey | null>,
    default: null,
  },
  sortDirection: {
    type: String as PropType<SortDirection>,
    default: null,
  },
});

const emit = defineEmits<{
  (e: "update:sort", key: SortKey | null, direction: SortDirection): void;
}>();

// Get current page from route for pagination component
const activePage = computed(() => parseInt(route.query.page as string) || 1);

// Sort handling - emit to parent to update URL
function toggleSort(key: SortKey) {
  if (props.sortKey === key) {
    // Cycle through: asc -> desc -> null
    if (props.sortDirection === "asc") {
      emit("update:sort", key, "desc");
    } else if (props.sortDirection === "desc") {
      emit("update:sort", null, null);
    } else {
      emit("update:sort", key, "asc");
    }
  } else {
    emit("update:sort", key, "asc");
  }
}

function getSortDirection(key: SortKey): SortDirection {
  return props.sortKey === key ? props.sortDirection : null;
}

// Expanded rows state
const expandedRows = ref<Set<string>>(new Set());

function toggleRow(agreementAddress: string) {
  if (expandedRows.value.has(agreementAddress)) {
    expandedRows.value.delete(agreementAddress);
  } else {
    expandedRows.value.add(agreementAddress);
  }
}

// Convert AgreementListItem to SafeHarborAgreement for AgreementDetails component
function toSafeHarborAgreement(item: AgreementListItem): SafeHarborAgreement {
  return {
    ...item,
    agreementURI: item.agreementUri,
    coveredContracts: item.coveredContracts || [],
    registeredAt: item.createdAt,
  };
}

function getStateColor(state?: ContractState): "neutral" | "success" | "warning" | "error" | "accent" {
  switch (state) {
    case ContractState.UNDER_ATTACK:
      return "success";
    case ContractState.ATTACK_REQUESTED:
      return "warning";
    case ContractState.PROMOTION_REQUESTED:
      return "accent";
    case ContractState.CORRUPTED:
      return "error";
    case ContractState.PRODUCTION:
      return "accent";
    case ContractState.NEW_DEPLOYMENT:
    default:
      return "neutral";
  }
}

function getStateLabel(state?: ContractState): string {
  if (!state) return "-";
  return t(`agreementsView.states.${state}`);
}

function getStateTooltip(state?: ContractState): string | undefined {
  switch (state) {
    case ContractState.UNDER_ATTACK:
      return "Open for ethical hacking";
    case ContractState.ATTACK_REQUESTED:
      return "Waiting for DAO approval";
    case ContractState.PROMOTION_REQUESTED:
      return "3-day delay before production";
    case ContractState.PRODUCTION:
      return "Protected, no longer attackable";
    case ContractState.CORRUPTED:
      return "Marked corrupted after successful attack";
    case ContractState.NEW_DEPLOYMENT:
      return "Registered, no attack requested yet";
    default:
      return undefined;
  }
}

function isDetailsPending(item: AgreementListItem): boolean {
  return item.protocolName == null && item.bountyPercentage == null;
}

function formatBountyCap(bountyCapUsd?: string): string {
  if (!bountyCapUsd) return "-";
  const value = Number(bountyCapUsd);
  if (value === 0) return "No cap";
  return `$${value.toLocaleString()}`;
}

function getBandColor(band?: string): "neutral" | "success" | "warning" | "error" | "accent" {
  switch (band) {
    case "$10M+":
      return "accent";
    case "$1M - $10M":
      return "accent";
    case "$100K - $1M":
      return "success";
    case "$10K - $100K":
      return "warning";
    default:
      return "neutral";
  }
}

function getValueTooltip(item: AgreementListItem): string {
  const lines: string[] = [];
  if (item.valuePricedTokens?.length) {
    for (const token of item.valuePricedTokens) {
      lines.push(`${token.symbol}: $${token.usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    }
  }
  if (item.valueUnpricedTokens?.length) {
    const names = item.valueUnpricedTokens.map((t) => t.symbol || t.address.slice(0, 10) + "…").join(", ");
    lines.push(`Unpriced: ${names}`);
  }
  if (item.valueEstimatedAt) {
    const ago = getTimeAgo(item.valueEstimatedAt);
    lines.push(`Updated: ${ago}`);
  }
  return lines.join("\n");
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
</script>

<style lang="scss">
.agreements-table {
  &.loading {
    .table-body td::before {
      @apply opacity-30;
    }
  }

  .protocol-name {
    @apply font-medium;
    color: var(--text-primary);
  }

  .table-body {
    @apply rounded-t-lg;

    td {
      @apply relative flex flex-col items-start justify-start whitespace-normal text-left md:table-cell md:text-left md:py-2.5;

      &:before {
        @apply block whitespace-nowrap text-xs uppercase content-[attr(data-heading)] md:content-none mb-0.5;
        color: var(--text-muted);
      }
    }
  }

  td.agreements-not-found {
    @apply my-0 table-cell items-start justify-start p-4 text-left;
    background-color: var(--bg-primary);
    color: var(--text-secondary);
  }

  // Sortable column headers
  .sortable-column {
    cursor: pointer;
    user-select: none;

    &:hover {
      background-color: var(--bg-hover);
    }
  }

  .column-header {
    @apply inline-flex items-center gap-1;
  }

  // Expand column
  .expand-column {
    @apply hidden md:table-cell w-10 min-w-10 max-w-10;
  }

  th.expand-column,
  td.expand-column {
    @apply hidden md:table-cell w-10 px-2;
  }

  .expand-icon {
    @apply h-4 w-4;
    color: var(--text-muted);
  }

  // Clickable rows
  .clickable-row {
    cursor: pointer;
  }

  // Expanded row
  .expanded-row {
    background-color: var(--bg-tertiary) !important;

    &:hover {
      background-color: var(--bg-tertiary) !important;
    }
  }

  .expanded-content {
    @apply p-0;
    border-top: 1px solid var(--border-subtle);

    // Reset AgreementDetails styles for inline display
    .agreement-details {
      @apply p-2 sm:p-4;
      background-color: transparent;
    }
  }

  th,
  td {
    &:nth-child(4),
    &:nth-child(5) {
      @apply text-right;
    }
  }

  // Est. Value column
  .est-value-column {
    .confidence-icon {
      @apply w-2.5 h-2.5;
    }

    .text-muted {
      color: var(--text-muted);
    }
  }

  // Prevent wrapping in Created column and fix vertical alignment
  .table-body td.created-column {
    @apply whitespace-nowrap;

    .copy-button-container {
      @apply flex items-center h-auto;

      .copy-button {
        @apply static p-0;
      }
    }
  }
}
</style>
