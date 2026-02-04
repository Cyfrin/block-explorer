<template>
  <div>
    <div class="head-block">
      <Breadcrumbs :items="breadcrumbItems" />
      <SearchForm class="search-form" />
    </div>
    <div class="page-header">
      <h1>{{ t("agreementsView.title") }}</h1>
      <div class="header-actions">
        <Dropdown
          :model-value="stateFilter"
          :options="filterOptions"
          :formatter="formatFilterOption"
          class="filter-dropdown"
          @update:model-value="updateFilter"
        />
        <button type="button" class="create-button" @click="openCreateModal">
          <PlusIcon class="icon" />
          {{ t("agreementsView.createButton") }}
        </button>
      </div>
    </div>
    <div class="agreements-container">
      <span v-if="error" class="error-message">
        {{ error }}
      </span>
      <AgreementsTable
        v-else
        class="agreements-table"
        :loading="isLoading"
        :agreements="agreements ?? []"
        :total="total ?? 0"
        :page-size="currentPageSize"
        :sort-key="sortKey"
        :sort-direction="sortDirection"
        @update:sort="updateSort"
      />
    </div>

    <CreateAgreementModal
      :is-open="isCreateModalOpen"
      contract-address=""
      @close="closeCreateModal"
      @success="handleCreateSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import { PlusIcon } from "@heroicons/vue/solid";

import SearchForm from "@/components/SearchForm.vue";
import AgreementsTable from "@/components/agreements/Table.vue";
import Breadcrumbs, { type BreadcrumbItem } from "@/components/common/Breadcrumbs.vue";
import Dropdown from "@/components/common/Dropdown.vue";
import CreateAgreementModal from "@/components/contract/CreateAgreementModal.vue";

import useAgreements, {
  type AgreementSearchParams,
  type AgreementStateFilter,
  type SortDirection,
  type SortKey,
} from "@/composables/useAgreements";
import useContext from "@/composables/useContext";

import { ContractState } from "@/types";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const context = useContext();

// Read all state from URL query params
const activePage = computed(() => parseInt(route.query.page as string) || 1);
const currentPageSize = computed(() => parseInt(route.query.pageSize as string) || 10);
const sortKey = computed<SortKey | null>(() => (route.query.sortBy as SortKey) || null);
const sortDirection = computed<SortDirection>(() => (route.query.sortOrder as SortDirection) || null);
const stateFilter = computed<AgreementStateFilter>(() => (route.query.state as AgreementStateFilter) || "ALL");

// Filter options
const filterOptions = [
  "ALL",
  ContractState.NEW_DEPLOYMENT,
  ContractState.ATTACK_REQUESTED,
  ContractState.UNDER_ATTACK,
  ContractState.CORRUPTED,
  ContractState.PROMOTION_REQUESTED,
  ContractState.PRODUCTION,
];

const formatFilterOption = (value: unknown): string => {
  if (value === "ALL") return t("agreementsView.filters.all");
  return t(`agreementsView.states.${value}`);
};

// Build search params from URL state
const searchParams = computed<AgreementSearchParams>(() => ({
  state: stateFilter.value,
  sortBy: sortKey.value,
  sortOrder: sortDirection.value,
}));

// Fetch agreements
const { data: agreements, total, isLoading, error, load } = useAgreements(searchParams, context);

// Watch for URL changes and reload data
watch(
  [activePage, currentPageSize, searchParams],
  ([page, pageSize]) => {
    load(page, pageSize);
  },
  { immediate: true }
);

// Update URL when sort changes (called from table component)
function updateSort(key: SortKey | null, direction: SortDirection) {
  const query: Record<string, string | undefined> = {
    ...route.query,
    page: "1", // Reset to page 1 on sort change
    sortBy: key || undefined,
    sortOrder: direction || undefined,
  };

  // Clean up undefined values
  Object.keys(query).forEach((k) => {
    if (query[k] === undefined) delete query[k];
  });

  router.push({ query });
}

// Update URL when filter changes
function updateFilter(state: string) {
  const query: Record<string, string | undefined> = {
    ...route.query,
    page: "1", // Reset to page 1 on filter change
    state: state === "ALL" ? undefined : state,
  };

  // Clean up undefined values
  Object.keys(query).forEach((k) => {
    if (query[k] === undefined) delete query[k];
  });

  router.push({ query });
}

// Modal state
import { ref } from "vue";
const isCreateModalOpen = ref(false);

const openCreateModal = () => {
  isCreateModalOpen.value = true;
};

const closeCreateModal = () => {
  isCreateModalOpen.value = false;
};

const handleCreateSuccess = () => {
  closeCreateModal();
  // Refresh the agreements list
  load(activePage.value, currentPageSize.value);
};

// Breadcrumbs
const breadcrumbItems = computed((): BreadcrumbItem[] => [
  {
    text: t("breadcrumbs.home"),
    to: { name: "home" },
  },
  {
    text: t("agreementsView.title"),
  },
]);
</script>

<style lang="scss" scoped>
.head-block {
  @apply mb-8 flex flex-col-reverse justify-between lg:mb-10 lg:flex-row;

  .search-form {
    @apply mb-6 w-full max-w-[26rem] lg:mb-0;
  }
}

.page-header {
  @apply flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between;

  h1 {
    @apply text-2xl font-semibold;
    color: var(--text-primary);
  }
}

.header-actions {
  @apply flex items-center gap-3;
}

.filter-dropdown {
  @apply w-40;
}

.create-button {
  @apply flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap;
  background-color: var(--accent);
  color: white;

  &:hover {
    background-color: var(--accent-hover);
  }

  .icon {
    @apply h-4 w-4;
  }
}

.agreements-container {
  @apply mt-8;
}

.error-message {
  @apply block rounded-md p-4 text-sm;
  background-color: var(--error-muted);
  color: var(--error-text);
}
</style>
