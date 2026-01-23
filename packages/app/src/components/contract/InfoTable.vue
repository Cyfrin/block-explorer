<template>
  <Table class="contract-info-table no-hover" :loading="loading">
    <template v-if="!loading && contract" #default>
      <tr>
        <table-body-column class="contract-info-field-label">
          {{ t("contract.table.address") }}
        </table-body-column>
        <table-body-column class="contract-info-field-value">
          <CopyContent :value="contract.address" />
        </table-body-column>
      </tr>
      <tr v-if="contract.creatorAddress && contract.creatorTxHash">
        <table-body-column class="contract-info-field-label">
          {{ t("contract.table.creator") }}
        </table-body-column>
        <table-body-column class="contract-info-field-value">
          <AddressLink :address="contract.creatorAddress">
            {{ shortValue(contract.creatorAddress) }}
          </AddressLink>
          at
          <router-link :to="{ name: 'transaction', params: { hash: contract.creatorTxHash } }">
            {{ shortValue(contract.creatorTxHash, 20) }}
          </router-link>
        </table-body-column>
      </tr>
      <tr>
        <table-body-column class="contract-info-field-label">
          {{ t("contract.table.transactions") }}
        </table-body-column>
        <table-body-column class="contract-info-field-value">
          {{ contract.totalTransactions }}
        </table-body-column>
      </tr>
      <tr>
        <table-body-column class="contract-info-field-label"> Contract state </table-body-column>
        <table-body-column class="contract-info-field-value contract-state-cell">
          <ContentLoader v-if="isContractStateLoading" />
          <template v-else-if="hasStateInfo">
            <ContractNotRegistered v-if="isNotRegistered" :contract-address="contractAddress" />
            <ContractStateTimeline
              v-else
              :state="contractState"
              :was-under-attack="wasUnderAttack"
              :registered-at="registeredAt"
              :under-attack-at="underAttackAt"
              :production-at="productionAt"
              :commitment-locked-until="commitmentLockedUntil"
            />
          </template>
          <span v-else class="fetch-error">Unable to load</span>
        </table-body-column>
      </tr>
      <tr>
        <table-body-column class="contract-info-field-label">
          {{ t("tabs.safeHarbor") }}
        </table-body-column>
        <table-body-column class="contract-info-field-value safe-harbor-cell">
          <ContentLoader v-if="isAgreementLoading" />
          <AgreementSummaryBadge v-else-if="isAgreementFetched" :agreement="agreement" :has-agreement="hasAgreement" />
          <span v-else class="fetch-error">Unable to load</span>
        </table-body-column>
      </tr>
    </template>
    <template v-if="!loading && !contract" #empty>
      <TableBodyColumn colspan="3">
        <div class="contract-not-found">
          {{ t("transactions.table.notFound") }}
        </div>
      </TableBodyColumn>
    </template>
    <template #loading>
      <tr class="loading-row" v-for="row in 3" :key="row">
        <TableBodyColumn>
          <ContentLoader />
        </TableBodyColumn>
        <TableBodyColumn>
          <ContentLoader />
        </TableBodyColumn>
      </tr>
    </template>
  </Table>
</template>

<script lang="ts" setup>
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";

import AddressLink from "@/components/AddressLink.vue";
import ContentLoader from "@/components/common/loaders/ContentLoader.vue";
import Table from "@/components/common/table/Table.vue";
import TableBodyColumn from "@/components/common/table/TableBodyColumn.vue";
import CopyContent from "@/components/common/table/fields/CopyContent.vue";
import AgreementSummaryBadge from "@/components/contract/AgreementSummaryBadge.vue";
import ContractNotRegistered from "@/components/contract/ContractNotRegistered.vue";
import ContractStateTimeline from "@/components/contract/ContractStateTimeline.vue";

import useBattlechainContractState from "@/composables/useBattlechainContractState";
import useSafeHarborAgreement from "@/composables/useSafeHarborAgreement";

import type { Contract } from "@/composables/useAddress";
import type { PropType } from "vue";

import { shortValue } from "@/utils/formatters";

const props = defineProps({
  contract: {
    type: Object as PropType<Contract>,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: true,
  },
});

const { t } = useI18n();

const contractAddress = computed(() => props.contract?.address || "");
const {
  agreement,
  hasAgreement,
  isLoading: isAgreementLoading,
  isFetched: isAgreementFetched,
  fetch: fetchAgreement,
} = useSafeHarborAgreement(contractAddress);
const {
  state: contractState,
  hasStateInfo,
  isLoading: isContractStateLoading,
  isNotRegistered,
  wasUnderAttack,
  registeredAt,
  underAttackAt,
  productionAt,
  commitmentLockedUntil,
  fetch: fetchContractState,
} = useBattlechainContractState(contractAddress);

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
</script>

<style scoped lang="scss">
.contract-info-table {
  .table-body-col {
    @apply py-4;
  }
  .loading-row {
    .table-body-col {
      @apply first:w-40;

      .content-loader {
        @apply w-full;

        &:nth-child(2) {
          @apply max-w-md;
        }
      }
    }
  }
  .contract-info-field-label {
    color: var(--text-muted);
  }

  .contract-info-field-value {
    color: var(--text-primary);
  }

  .contract-not-found {
    @apply px-1.5 py-2;
    color: var(--text-secondary);
  }

  .fetch-error {
    @apply text-sm;
    color: var(--text-muted);
  }

  .contract-state-cell {
    @apply whitespace-normal;
  }

  .safe-harbor-cell {
    @apply align-top;
  }
}
</style>
