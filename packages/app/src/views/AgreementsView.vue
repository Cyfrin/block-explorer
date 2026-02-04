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
          v-model="selectedFilter"
          :options="filterOptions"
          :formatter="formatFilterOption"
          class="filter-dropdown"
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
      <AgreementsTable v-else class="agreements-table" :loading="isLoading" :agreements="agreements ?? []" />
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
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { PlusIcon } from "@heroicons/vue/solid";

import SearchForm from "@/components/SearchForm.vue";
import AgreementsTable from "@/components/agreements/Table.vue";
import Breadcrumbs, { type BreadcrumbItem } from "@/components/common/Breadcrumbs.vue";
import Dropdown from "@/components/common/Dropdown.vue";
import CreateAgreementModal from "@/components/contract/CreateAgreementModal.vue";

import useAgreements, { type AgreementStateFilter } from "@/composables/useAgreements";
import useContext from "@/composables/useContext";

import { ContractState } from "@/types";

const { t } = useI18n();
const context = useContext();

// Filter state
const selectedFilter = ref<string>("ALL");
const filterOptions = [
  "ALL",
  ContractState.UNDER_ATTACK,
  ContractState.ATTACK_REQUESTED,
  ContractState.PROMOTION_REQUESTED,
  ContractState.PRODUCTION,
  ContractState.CORRUPTED,
  ContractState.NEW_DEPLOYMENT,
];

const formatFilterOption = (value: unknown): string => {
  if (value === "ALL") return t("agreementsView.filters.all");
  return t(`agreementsView.states.${value}`);
};

// Convert to the expected type
const stateFilter = computed<AgreementStateFilter>(() => {
  if (selectedFilter.value === "ALL") return "ALL";
  return selectedFilter.value as ContractState;
});

// Fetch agreements
const { agreements, isLoading, error, fetch } = useAgreements(stateFilter, context);

// Modal state
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
  fetch();
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
