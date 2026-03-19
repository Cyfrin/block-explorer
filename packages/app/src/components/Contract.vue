<template>
  <div class="head-block">
    <Breadcrumbs :items="breadcrumbItems" />
    <SearchForm class="search-form" />
  </div>
  <Title
    v-if="contract?.address && !pending"
    :title="contractName ?? t('contract.title')"
    :value="contractName ? undefined : contract?.address"
    :is-verified="contract?.verificationInfo != null"
    :is-evm-like="contract?.isEvmLike"
  />
  <Spinner v-else size="md" />

  <!-- Safe Harbor Agreement Banner - shown for agreement contracts -->
  <div v-if="isAgreementContract && !pending && isAgreementFetched && hasAgreement" class="agreement-banner">
    <div class="banner-content">
      <ShieldCheckIcon class="banner-icon" />
      <div class="banner-text">
        <span class="banner-title">Safe Harbor Agreement Contract</span>
        <span class="banner-subtitle"
          >This contract is a registered Safe Harbor agreement{{
            agreement?.protocolName ? ` for ${agreement.protocolName}` : ""
          }}</span
        >
      </div>
    </div>
    <a href="#agreement-details" class="view-details-link" @click.prevent="scrollToAgreementDetails">
      View Agreement
      <ChevronDownIcon class="link-icon" />
    </a>
  </div>

  <div class="tables-container">
    <div class="contract-tables-container">
      <div>
        <ContractInfoTable
          class="contract-info-table"
          :loading="pending"
          :contract="contract!"
          :is-agreement-contract="isAgreementContract"
          @request-attackable-mode="openRequestUnderAttackModal"
          @go-to-production="handleGoToProduction"
        />
      </div>
      <div>
        <BalanceTable class="balance-table" :loading="pending" :balances="contract?.balances">
          <template #not-found>
            <EmptyState>
              <template #image>
                <div class="balances-empty-icon">
                  <img src="/images/empty-state/empty_balance.svg" alt="empty_balance" />
                </div>
              </template>
              <template #title>
                {{ t("contract.balances.notFound.title") }}
              </template>
              <template #description>
                <div class="balances-empty-description">{{ t("contract.balances.notFound.subtitle") }}</div>
              </template>
            </EmptyState>
          </template>
          <template #failed>
            <EmptyState>
              <template #image>
                <div class="balances-empty-icon">
                  <img src="/images/empty-state/error_balance.svg" alt="empty_balance" />
                </div>
              </template>
              <template #title>
                {{ t("contract.balances.error.title") }}
              </template>
              <template #description>
                <div class="balances-empty-description">{{ t("contract.balances.error.subtitle") }}</div>
              </template>
            </EmptyState>
          </template>
        </BalanceTable>
      </div>
    </div>

    <Tabs v-if="contract?.address && !pending" class="contract-tabs" :tabs="tabs">
      <template #tab-1-content>
        <TransactionsTable
          class="transactions-table"
          :search-params="transactionsSearchParams"
          :contract-abi="contractABI"
        >
          <template #not-found>
            <TransactionEmptyState />
          </template>
        </TransactionsTable>
      </template>
      <template #tab-2-content>
        <TransfersTable :address="contract.address" />
      </template>
      <template #tab-3-content>
        <ContractInfoTab :contract="contract" />
      </template>
      <template #tab-4-content>
        <ContractEvents :contract="contract" />
      </template>
      <template v-if="showSafeHarborTab" #tab-5-content>
        <div class="safe-harbor-tab-content">
          <ContentLoader v-if="isAgreementLoading" class="agreement-loader" />
          <template v-else-if="isAgreementFetched">
            <template v-if="hasAgreement">
              <!-- Request Attackable Mode prompt (shown only in NEW_DEPLOYMENT state) -->
              <div v-if="showRequestUnderAttackPrompt" class="request-attackable-prompt">
                <div class="prompt-header">
                  <ExclamationCircleIcon class="prompt-icon" />
                  <span class="prompt-title">{{ t("requestAttackableMode.title") }}</span>
                </div>
                <p class="prompt-description">{{ t("requestAttackableMode.description") }}</p>
                <button type="button" class="request-button" @click="openRequestUnderAttackModal">
                  {{ t("requestAttackableMode.requestButton") }}
                </button>
              </div>
              <AgreementDetails
                v-for="item in agreements"
                :key="item.agreement.agreementAddress"
                :agreement="item.agreement"
                :owner="item.agreement.owner"
                :wallet-address="walletAddress"
                :contract-state="item.state ?? contractState"
                @agreement-updated="handleAgreementUpdated"
                @connect-wallet="connectWallet"
                @request-promotion="openRequestPromotionModal"
                @cancel-promotion="openCancelPromotionModal"
              />
            </template>
            <NoAgreementWarning
              v-else
              :contract-address="contractAddress"
              :creator-address="contract?.creatorAddress"
              @agreement-created="handleAgreementCreated"
            />
          </template>
          <span v-else class="fetch-error">Unable to load Safe Harbor data</span>
        </div>
      </template>
    </Tabs>

    <!-- Agreement Details - shown below tabs for agreement contracts -->
    <div
      v-if="isAgreementContract && !pending"
      id="agreement-details"
      ref="agreementDetailsRef"
      class="agreement-contract-details"
    >
      <ContentLoader v-if="isAgreementLoading" class="agreement-loader" />
      <template v-else-if="isAgreementFetched && hasAgreement">
        <AgreementDetails
          v-for="item in agreements"
          :key="item.agreement.agreementAddress"
          :agreement="item.agreement"
          :owner="item.agreement.owner"
          :wallet-address="walletAddress"
          :contract-state="item.state ?? agreementState"
          @agreement-updated="handleAgreementUpdated"
          @connect-wallet="connectWallet"
        />
      </template>
    </div>

    <!-- Request Under Attack Modal -->
    <RequestUnderAttackModal
      :is-open="showRequestUnderAttackModal"
      :contract-address="contractAddress"
      @close="closeRequestUnderAttackModal"
      @success="handleRequestUnderAttackSuccess"
    />

    <!-- Go To Production Modal -->
    <GoToProductionModal
      :is-open="showGoToProductionModal"
      :contract-address="contractAddress"
      :agreement-address="agreement?.agreementAddress ?? ''"
      @close="closeGoToProductionModal"
      @success="handleGoToProductionSuccess"
    />

    <!-- Request Promotion Modal (uses GoToProductionModal with mode="promote") -->
    <GoToProductionModal
      :is-open="showRequestPromotionModal"
      :contract-address="contractAddress"
      :agreement-address="agreement?.agreementAddress ?? ''"
      mode="promote"
      @close="closeRequestPromotionModal"
      @success="handleRequestPromotionSuccess"
    />

    <!-- Cancel Promotion Modal -->
    <CancelPromotionModal
      :is-open="showCancelPromotionModal"
      :agreement-address="agreement?.agreementAddress ?? ''"
      @close="closeCancelPromotionModal"
      @success="handleCancelPromotionSuccess"
    />
  </div>
</template>
<script lang="ts" setup>
import { computed, type PropType, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { ChevronDownIcon, ExclamationCircleIcon } from "@heroicons/vue/outline";
import { CheckCircleIcon, ShieldCheckIcon } from "@heroicons/vue/solid";

import SearchForm from "@/components/SearchForm.vue";
import BalanceTable from "@/components/balances/Table.vue";
import Breadcrumbs from "@/components/common/Breadcrumbs.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import Spinner from "@/components/common/Spinner.vue";
import Tabs from "@/components/common/Tabs.vue";
import Title from "@/components/common/Title.vue";
import ContentLoader from "@/components/common/loaders/ContentLoader.vue";
import AgreementDetails from "@/components/contract/AgreementDetails.vue";
import CancelPromotionModal from "@/components/contract/CancelPromotionModal.vue";
import ContractInfoTab from "@/components/contract/ContractInfoTab.vue";
import GoToProductionModal from "@/components/contract/GoToProductionModal.vue";
import ContractInfoTable from "@/components/contract/InfoTable.vue";
import NoAgreementWarning from "@/components/contract/NoAgreementWarning.vue";
import RequestUnderAttackModal from "@/components/contract/RequestUnderAttackModal.vue";
import TransactionEmptyState from "@/components/contract/TransactionEmptyState.vue";
import ContractEvents from "@/components/event/ContractEvents.vue";
import TransactionsTable from "@/components/transactions/Table.vue";
import TransfersTable from "@/components/transfers/Table.vue";

import useBattlechainContractState from "@/composables/useBattlechainContractState";
import useContext from "@/composables/useContext";
import useIsBattlechainExcluded from "@/composables/useIsBattlechainExcluded";
import useSafeHarborAgreement from "@/composables/useSafeHarborAgreement";
import { default as useWallet } from "@/composables/useWallet";

import type { BreadcrumbItem } from "@/components/common/Breadcrumbs.vue";
import type { Contract } from "@/composables/useAddress";

import { ContractState } from "@/types";
import { shortValue } from "@/utils/formatters";

const { t } = useI18n();
const context = useContext();

// Setup wallet for ownership checks in AgreementDetails
const walletContext = {
  isReady: context.isReady,
  currentNetwork: computed(() => ({
    ...context.currentNetwork.value,
    explorerUrl: context.currentNetwork.value.rpcUrl,
    chainName: context.currentNetwork.value.l2NetworkName,
    l1ChainId: null as unknown as number,
  })),
  networks: context.networks,
  getL2Provider: () => context.getL2Provider(),
};

const { address: walletAddress, connect: connectWallet } = useWallet(walletContext);

// Ref for agreement details section (used for smooth scrolling)
const agreementDetailsRef = ref<HTMLElement | null>(null);

const scrollToAgreementDetails = () => {
  agreementDetailsRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const props = defineProps({
  contract: {
    type: [Object, null] as PropType<Contract | null>,
    required: true,
    default: null,
  },
  pending: {
    type: Boolean,
    default: false,
  },
  failed: {
    type: Boolean,
    default: false,
  },
});

const contractAddress = computed(() => props.contract?.address || "");
const {
  agreements,
  agreement,
  agreementState,
  hasAgreement,
  isAgreementContract,
  isLoading: isAgreementLoading,
  isFetched: isAgreementFetched,
  fetch: fetchAgreement,
} = useSafeHarborAgreement(contractAddress);

const {
  state: contractState,
  hasStateInfo,
  hasRequestedAttack,
  fetch: fetchContractState,
  pollUntilStateChanges,
} = useBattlechainContractState(contractAddress);

const { isExcluded: isBattlechainExcluded } = useIsBattlechainExcluded(contractAddress);

// Show the request under attack prompt when contract is NEW_DEPLOYMENT and has an agreement
const showRequestUnderAttackPrompt = computed(
  () => contractState.value === ContractState.NEW_DEPLOYMENT && hasAgreement.value && agreement.value
);

// Show Safe Harbor tab when contract has called requestUnderAttack (covered contract with attack flow started)
// Do NOT show for agreement contracts - they display AgreementDetails directly on the page
const showSafeHarborTab = computed(
  () => !isBattlechainExcluded.value && !isAgreementContract.value && hasStateInfo.value && hasRequestedAttack.value
);

watch(
  () => props.contract?.address,
  (address) => {
    if (address) {
      fetchAgreement();
      fetchContractState();
    }
  },
  { immediate: true }
);

// Request Under Attack modal state
const showRequestUnderAttackModal = ref(false);

const openRequestUnderAttackModal = () => {
  showRequestUnderAttackModal.value = true;
};

const closeRequestUnderAttackModal = () => {
  showRequestUnderAttackModal.value = false;
  // Refetch contract state in case a request was submitted
  fetchContractState();
};

const handleRequestUnderAttackSuccess = () => {
  // Don't close the modal — let the user see the success step (step 3).
  // The modal closes when they click "Done", which triggers close.
  // Poll until the indexer picks up the state change, then refresh agreement state too.
  pollUntilStateChanges().then(() => fetchAgreement());
};

// Go To Production modal state
const showGoToProductionModal = ref(false);

const openGoToProductionModal = () => {
  showGoToProductionModal.value = true;
};

const closeGoToProductionModal = () => {
  showGoToProductionModal.value = false;
};

const handleGoToProductionSuccess = () => {
  showGoToProductionModal.value = false;
  pollUntilStateChanges().then(() => fetchAgreement());
};

// Request Promotion modal state
const showRequestPromotionModal = ref(false);

const openRequestPromotionModal = () => {
  showRequestPromotionModal.value = true;
};

const closeRequestPromotionModal = () => {
  showRequestPromotionModal.value = false;
};

const handleRequestPromotionSuccess = () => {
  showRequestPromotionModal.value = false;
  pollUntilStateChanges().then(() => fetchAgreement());
};

// Cancel Promotion modal state
const showCancelPromotionModal = ref(false);

const openCancelPromotionModal = () => {
  showCancelPromotionModal.value = true;
};

const closeCancelPromotionModal = () => {
  showCancelPromotionModal.value = false;
};

const handleCancelPromotionSuccess = () => {
  showCancelPromotionModal.value = false;
  pollUntilStateChanges().then(() => fetchAgreement());
};

const handleAgreementCreated = () => {
  // Refetch agreement data after successful creation
  fetchAgreement();
};

const handleAgreementUpdated = () => {
  // Refetch agreement data after successful update
  fetchAgreement();
};

const handleGoToProduction = () => {
  openGoToProductionModal();
};

const tabs = computed(() => {
  const baseTabs = [
    { title: t("tabs.transactions"), hash: "#transactions" },
    { title: t("tabs.transfers"), hash: "#transfers" },
    {
      title: t("tabs.contract"),
      hash: "#contract",
      icon: props.contract?.verificationInfo ? CheckCircleIcon : null,
    },
    { title: t("tabs.events"), hash: "#events" },
  ];

  // Only include Safe Harbor tab if contract is registered in AttackRegistry
  if (showSafeHarborTab.value) {
    baseTabs.push({
      title: t("tabs.safeHarbor"),
      hash: "#safe-harbor",
      icon: hasAgreement.value ? ShieldCheckIcon : null,
    });
  }

  return baseTabs;
});

const breadcrumbItems = computed((): BreadcrumbItem[] | [] => {
  if (props.contract?.address) {
    return [
      { to: { name: "home" }, text: t("breadcrumbs.home") },
      {
        text: `${t("contract.contractNumber")}${shortValue(props.contract?.address)}`,
      },
    ];
  }
  return [];
});

const contractName = computed(() =>
  props.contract?.verificationInfo?.compilation.fullyQualifiedName.replace(/.*\.sol:/, "")
);
const contractABI = computed(() => props.contract?.verificationInfo?.abi);

const transactionsSearchParams = computed(() => ({
  address: props.contract?.address,
}));
</script>
<style lang="scss" scoped>
.head-block {
  @apply mb-8 flex flex-col-reverse justify-between lg:mb-10 lg:flex-row;
  h1 {
    @apply mt-3;
  }
  .search-form {
    @apply mb-6 w-full max-w-[26rem] lg:mb-0;
  }
}
.tables-container {
  @apply mt-8 grid grid-cols-1 gap-4;
  .contract-tabs {
    @apply shadow-md;
  }
  .contract-tables-container {
    @apply grid grid-cols-1 gap-4 lg:grid-cols-2;
  }
  h2 {
    @apply mb-4;
  }
  .contract-info-table {
    @apply mb-8 overflow-hidden;
  }
  .transactions-table {
    @apply shadow-none;
    .table-body {
      @apply rounded-none;
    }
  }
  .balance-table {
    @apply mb-4 overflow-hidden;
    background-color: var(--bg-primary);
    .balances-empty-icon {
      @apply m-auto;
      img {
        @apply w-[2.875rem];
      }
    }
    .balances-empty-description {
      @apply max-w-[16rem] whitespace-normal;
    }
  }
}
.transaction-table-error {
  @apply text-2xl text-error-700;
}
.agreement-banner {
  @apply mt-8 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4;
  border-color: var(--accent-muted, var(--border-default));
  background-color: var(--bg-primary);

  .banner-content {
    @apply flex items-center gap-2 sm:gap-3;
  }

  .banner-icon {
    @apply hidden h-6 w-6 shrink-0 sm:block sm:h-8 sm:w-8;
    color: var(--accent);
  }

  .banner-text {
    @apply flex flex-col;
  }

  .banner-title {
    @apply text-xs font-semibold sm:text-sm;
    color: var(--text-primary);
  }

  .banner-subtitle {
    @apply text-xs leading-snug;
    color: var(--text-muted);
  }

  .view-details-link {
    @apply flex w-full shrink-0 items-center justify-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:w-auto sm:py-1.5;
    background-color: var(--bg-tertiary);
    color: var(--accent);

    &:hover {
      background-color: var(--bg-hover);
    }

    .link-icon {
      @apply h-4 w-4;
    }
  }
}

.agreement-contract-details {
  @apply mt-4 overflow-hidden rounded-lg p-4;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-md);
  scroll-margin-top: 4.5rem; // Header height (3.5rem/56px) + some padding

  .agreement-loader {
    @apply h-6 w-48;
  }
}
.safe-harbor-tab-content {
  @apply p-4;

  .agreement-loader {
    @apply h-6 w-48;
  }

  .fetch-error {
    @apply text-sm;
    color: var(--text-muted);
  }
}

.request-attackable-prompt {
  @apply mb-4 flex flex-col gap-2 rounded-lg border p-4;
  border-color: var(--warning-border, var(--border-default));
  background-color: var(--warning-bg, var(--bg-secondary));

  .prompt-header {
    @apply flex items-center gap-2;
  }

  .prompt-icon {
    @apply h-5 w-5 shrink-0;
    color: var(--warning, #f59e0b);
  }

  .prompt-title {
    @apply text-sm font-semibold;
    color: var(--warning-text, var(--text-primary));
  }

  .prompt-description {
    @apply text-sm leading-relaxed;
    color: var(--text-secondary);
  }

  .request-button {
    @apply mt-2 flex w-fit items-center gap-2 rounded-md px-4 py-2 text-sm font-medium;
    background-color: var(--warning, #f59e0b);
    color: var(--text-on-warning, white);

    &:hover {
      background-color: var(--warning-hover, #d97706);
    }
  }
}
</style>

<style lang="scss">
.contract-tabs {
  .tab-head {
    @apply overflow-auto;
  }
  .transactions-table {
    .table-body {
      @apply rounded-t-none;
    }
    table thead tr th {
      @apply first:rounded-none last:rounded-none;
    }
  }
}
</style>
