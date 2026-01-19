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
      <tr v-if="contractState">
        <table-body-column class="contract-info-field-label"> Contract state </table-body-column>
        <table-body-column class="contract-info-field-value">
          <ContractStateTimeline
            :state="contractState"
            :was-under-attack="wasUnderAttack"
            :deployed-at="deployedAt"
            :under-attack-at="underAttackAt"
            :production-at="productionAt"
          />
        </table-body-column>
      </tr>
      <tr>
        <table-body-column class="contract-info-field-label">
          {{ t("tabs.safeHarbor") }}
        </table-body-column>
        <table-body-column class="contract-info-field-value safe-harbor-cell">
          <AgreementSummaryBadge :agreement="agreement" :has-agreement="hasAgreement" />
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
const { agreement, hasAgreement, fetch: fetchAgreement } = useSafeHarborAgreement(contractAddress);
const {
  state: contractState,
  wasUnderAttack,
  deployedAt,
  underAttackAt,
  productionAt,
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

  .safe-harbor-cell {
    @apply align-top;
  }
}
</style>
