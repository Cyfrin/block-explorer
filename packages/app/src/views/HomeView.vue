<template>
  <div class="home-view">
    <!-- Hero Section with Search -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">{{ t("blockExplorer.title") }}</h1>
        <p class="hero-subtitle">{{ t("blockExplorer.subtitle") }}</p>
        <SearchForm class="hero-search" />
      </div>
    </section>

    <!-- Network Stats -->
    <section class="stats-section">
      <NetworkStats
        v-if="networkStats || networkStatsPending"
        :loading="networkStatsPending"
        :committed="networkStats?.lastSealedBlock"
        :verified="networkStats?.lastVerifiedBlock"
        :transactions="networkStats?.totalTransactions"
      />
    </section>

    <!-- Latest Data Grid -->
    <section class="data-grid">
      <!-- Latest Blocks -->
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title-row">
            <h2 class="data-card-title">{{ t("blockExplorer.latestBlocks") }}</h2>
            <InfoTooltip>{{ t("blocks.tooltipInfo") }}</InfoTooltip>
          </div>
        </div>
        <div class="data-card-content">
          <template v-if="(isBlocksPending || blocks) && !isBlocksFailed">
            <TableBlocks :data-testid="$testId.latestBlocksTable" :loading="isBlocksPending" :blocks="displayedBlocks">
              <template #not-found>
                <p class="empty-state">{{ t("blocks.table.notFoundHomePage") }}</p>
              </template>
            </TableBlocks>
          </template>
          <div v-else-if="isBlocksFailed" class="error-state">
            {{ t("failedRequest") }}
          </div>
        </div>
        <div class="data-card-footer">
          <Button variant="ghost" @click="router.push('blocks')">
            {{ t("blocks.viewAll") }}
            <ArrowRightIcon class="btn-icon" />
          </Button>
        </div>
      </div>

      <!-- Latest Transactions -->
      <div class="data-card">
        <div class="data-card-header">
          <h2 class="data-card-title">{{ t("blockExplorer.latestTransactions") }}</h2>
        </div>
        <div class="data-card-content">
          <TransactionsTable
            :columns="['status', 'transactionHash', 'age']"
            :pagination="false"
            :data-testid="$testId.latestTransactionsTable"
          >
            <template #not-found>
              <TableBodyColumn>
                <p class="empty-state">{{ t("transactions.table.notFoundHomePage") }}</p>
              </TableBodyColumn>
            </template>
          </TransactionsTable>
        </div>
        <div class="data-card-footer">
          <Button variant="ghost" @click="router.push('transactions')">
            {{ t("transactions.viewAll") }}
            <ArrowRightIcon class="btn-icon" />
          </Button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { ArrowRightIcon } from "@heroicons/vue/outline";

import NetworkStats from "@/components/NetworkStats.vue";
import SearchForm from "@/components/SearchForm.vue";
import TableBlocks from "@/components/blocks/Table.vue";
import Button from "@/components/common/Button.vue";
import InfoTooltip from "@/components/common/InfoTooltip.vue";
import TableBodyColumn from "@/components/common/table/TableBodyColumn.vue";
import TransactionsTable from "@/components/transactions/Table.vue";

import useBlocks from "@/composables/useBlocks";
import useNetworkStats from "@/composables/useNetworkStats";

import router from "@/router";

const { t } = useI18n();
const { fetch: fetchNetworkStats, pending: networkStatsPending, item: networkStats } = useNetworkStats();
const { load: getBlocks, pending: isBlocksPending, failed: isBlocksFailed, data: blocks } = useBlocks();

const displayedBlocks = computed(() => {
  return blocks.value ? blocks.value : [];
});

fetchNetworkStats();
getBlocks(1, new Date());
</script>

<style lang="scss" scoped>
.home-view {
  @apply flex flex-col gap-6 pb-8;
}

// Hero Section
.hero-section {
  @apply py-8;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-subtle);
  // Extend full width and compensate for container padding
  margin: -1.5rem calc(-50vw + 50%) 0;
  padding-left: calc(50vw - 50%);
  padding-right: calc(50vw - 50%);
}

.hero-content {
  @apply max-w-[1240px] mx-auto px-4 xl:px-0;
}

.hero-title {
  @apply text-3xl font-bold m-0 sm:text-[40px];
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.hero-subtitle {
  @apply text-lg mt-2 mb-0 ml-0 mr-0 sm:text-xl;
  color: var(--text-secondary);
}

.hero-search {
  @apply mt-6 max-w-[560px];
}

// Stats Section
.stats-section {
  // Stats component handles its own styling
}

// Data Grid
.data-grid {
  @apply grid gap-6 grid-cols-1 lg:grid-cols-2;
}

.data-card {
  @apply flex flex-col overflow-hidden rounded-lg;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);
}

.data-card-header {
  @apply p-4;
  border-bottom: 1px solid var(--border-subtle);
}

.data-card-title-row {
  @apply flex items-center gap-2;
}

.data-card-title {
  @apply text-lg font-semibold m-0;
  color: var(--text-primary);
}

.data-card-content {
  @apply flex-1 min-h-0;

  // Remove nested table borders
  :deep(.table-container) {
    @apply border-none rounded-none;
  }
}

.data-card-footer {
  @apply py-3 px-4 flex justify-end;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-subtle);
}

.btn-icon {
  @apply w-4 h-4 ml-1;
}

.empty-state {
  @apply p-8 text-center text-base;
  color: var(--text-muted);
}

.error-state {
  @apply flex items-center justify-center p-6 m-4 text-center text-base rounded-md;
  color: var(--error-text);
  background-color: var(--error-muted);
  border: 1px solid var(--error);
}
</style>
