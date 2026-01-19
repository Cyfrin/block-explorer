<template>
  <div class="error-container" v-if="isRequestFailed && !isRequestPending">
    <PageError />
  </div>
  <div v-else-if="props.hash && isTransactionHash(props.hash)" class="detail-view">
    <div class="detail-header">
      <Breadcrumbs :items="breadcrumbItems" />
      <SearchForm class="header-search" />
    </div>
    <Title
      :title="t('transactions.transaction')"
      :value="hash"
      class="detail-title"
      :is-evm-like="transaction?.isEvmLike"
    />
    <Tabs v-if="transaction || isRequestPending" :tabs="tabs">
      <template #tab-1-content>
        <GeneralInfo
          :transaction="transactionWithData"
          :decoding-data-error="decodingError"
          :loading="isRequestPending || isDecodeTransactionDataPending"
        />
      </template>
      <template #tab-2-content>
        <Logs
          :logs="transactionEventLogs"
          :initiator-address="transaction?.from"
          :loading="isRequestPending || isDecodeEventLogsPending"
        />
      </template>
    </Tabs>
  </div>
</template>

<script lang="ts" setup>
import { computed, watchEffect } from "vue";
import { useI18n } from "vue-i18n";

import PageError from "@/components/PageError.vue";
import SearchForm from "@/components/SearchForm.vue";
import Breadcrumbs, { type BreadcrumbItem } from "@/components/common/Breadcrumbs.vue";
import Tabs from "@/components/common/Tabs.vue";
import Title from "@/components/common/Title.vue";
import GeneralInfo from "@/components/transactions/infoTable/GeneralInfo.vue";
import Logs from "@/components/transactions/infoTable/Logs.vue";

import useEventLog from "@/composables/useEventLog";
import useNotFound from "@/composables/useNotFound";
import useTransaction, { type TransactionItem } from "@/composables/useTransaction";
import useTransactionData from "@/composables/useTransactionData";

import { shortValue } from "@/utils/formatters";
import { isTransactionHash } from "@/utils/validators";

const props = defineProps({
  hash: {
    type: String,
    required: true,
  },
});

const { t } = useI18n();
const { useNotFoundView, setNotFoundView } = useNotFound();
const { transaction, isRequestPending, isRequestFailed, getByHash } = useTransaction();
const { collection: transactionEventLogs, isDecodePending: isDecodeEventLogsPending, decodeEventLog } = useEventLog();
const {
  data: transactionData,
  isDecodePending: isDecodeTransactionDataPending,
  decodingError,
  decodeTransactionData,
} = useTransactionData();

const transactionWithData = computed<TransactionItem | null>(() => {
  if (transaction.value && transactionData.value) {
    return {
      ...transaction.value,
      data: transactionData.value,
    };
  }
  return transaction.value;
});

const blockNumber = computed(() => transaction.value?.blockNumber);
const breadcrumbItems = computed((): BreadcrumbItem[] => [
  { to: { name: "home" }, text: t("breadcrumbs.home") },
  blockNumber.value
    ? {
        to: { name: "block", params: { id: blockNumber.value } },
        text: `${t("blocks.blockNumber")}${blockNumber.value}`,
      }
    : { text: t("blocks.blocks") },
  {
    text: `${t("transactions.transaction")} ${
      transaction.value?.hash ? shortValue(transaction.value.hash) : shortValue(props.hash)
    }`,
  },
]);

const tabs = computed(() => [
  {
    title: t("transactions.tabs.generalInfo"),
    hash: "#overview",
  },
  {
    title: t("transactions.tabs.logs") + (transaction.value ? ` (${transaction.value?.logs.length})` : ""),
    hash: "#eventlog",
  },
]);

useNotFoundView(isRequestPending, isRequestFailed, transaction);

watchEffect(() => {
  if (!props.hash || !isTransactionHash(props.hash)) {
    return setNotFoundView();
  }
  getByHash(props.hash).then(() => {
    if (!transaction.value) {
      transactionEventLogs.value = [];
      return;
    }
    decodeEventLog(transaction.value.logs);
    decodeTransactionData(transaction.value.data);
  });
});
</script>

<style lang="scss" scoped>
.detail-view {
  @apply flex flex-col gap-6;
}

.detail-header {
  @apply flex flex-col-reverse gap-4 lg:flex-row lg:justify-between lg:items-start;
}

.header-search {
  @apply w-full max-w-[420px];
}

.detail-title {
  @apply mt-2;
}

.error-container {
  @apply flex justify-center pt-12;
}
</style>
