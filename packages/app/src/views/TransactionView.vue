<template>
  <div class="error-container" v-if="isRequestFailed && !isRequestPending">
    <PageError />
  </div>
  <TransactionNotFound
    v-else-if="isTransactionNotFound && !isRequestPending"
    :hash="props.hash"
    :is-polling="isPolling"
  />
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
import { computed, onBeforeUnmount, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";

import PageError from "@/components/PageError.vue";
import SearchForm from "@/components/SearchForm.vue";
import Breadcrumbs, { type BreadcrumbItem } from "@/components/common/Breadcrumbs.vue";
import Tabs from "@/components/common/Tabs.vue";
import Title from "@/components/common/Title.vue";
import TransactionNotFound from "@/components/transactions/TransactionNotFound.vue";
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
const { setNotFoundView } = useNotFound();
const { transaction, isRequestPending, isRequestFailed, isTransactionNotFound, getByHash } = useTransaction();
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

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 5;
const isPolling = ref(false);
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollAttempts = 0;

const stopPolling = () => {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  isPolling.value = false;
};

const pollForTransaction = () => {
  pollAttempts = 0;
  isPolling.value = true;

  const poll = async () => {
    pollAttempts++;
    await getByHash(props.hash, { silent: true });

    if (transaction.value) {
      stopPolling();
      decodeEventLog(transaction.value.logs);
      decodeTransactionData(transaction.value.data);
      return;
    }

    if (pollAttempts >= MAX_POLL_ATTEMPTS) {
      stopPolling();
      return;
    }

    pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
  };

  pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
};

onBeforeUnmount(stopPolling);

watchEffect(() => {
  if (!props.hash || !isTransactionHash(props.hash)) {
    return setNotFoundView();
  }
  stopPolling();
  getByHash(props.hash).then(() => {
    if (!transaction.value) {
      transactionEventLogs.value = [];
      if (isTransactionNotFound.value) {
        pollForTransaction();
      }
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
