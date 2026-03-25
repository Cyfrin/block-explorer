<template>
  <div class="transaction-not-found">
    <div class="icon-container">
      <ClockIcon class="clock-icon" />
    </div>
    <h1 class="title">{{ t("transactions.pendingNotFound.title") }}</h1>
    <p class="description">{{ t("transactions.pendingNotFound.description") }}</p>
    <div class="hash-display">
      <span class="hash-label">{{ t("transactions.pendingNotFound.hash") }}</span>
      <span class="hash-value">{{ hash }}</span>
    </div>
    <div class="polling-status">
      <template v-if="isPolling">
        <Spinner size="xs" color="neutral" />
        <span>{{ t("transactions.pendingNotFound.polling") }}</span>
      </template>
      <template v-else>
        <p>{{ t("transactions.pendingNotFound.gaveUp") }}</p>
      </template>
    </div>
    <SearchForm class="search-form" />
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";

import { ClockIcon } from "@heroicons/vue/outline";

import SearchForm from "@/components/SearchForm.vue";
import Spinner from "@/components/common/Spinner.vue";

defineProps({
  hash: {
    type: String,
    required: true,
  },
  isPolling: {
    type: Boolean,
    required: true,
  },
});

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.transaction-not-found {
  @apply flex min-h-[calc(100vh-260px)] flex-col items-center justify-center text-center;

  .icon-container {
    @apply my-8 flex h-16 w-16 items-center justify-center rounded-full;
    background-color: var(--bg-tertiary);
  }

  .clock-icon {
    @apply h-8 w-8;
    color: var(--text-primary);
  }

  .title {
    @apply mb-4 text-3xl sm:text-4xl;
    color: var(--text-primary);
  }

  .description {
    @apply mb-6 max-w-xl text-lg leading-6 sm:text-xl;
    color: var(--text-secondary);
  }

  .hash-display {
    @apply mb-6 flex flex-col gap-1 rounded-md px-4 py-3;
    background-color: var(--bg-tertiary);

    .hash-label {
      @apply text-xs uppercase tracking-wide;
      color: var(--text-secondary);
    }

    .hash-value {
      @apply break-all font-mono text-sm;
      color: var(--text-primary);
    }
  }

  .polling-status {
    @apply mb-6 flex min-h-8 items-center gap-2 text-base;
    color: var(--text-secondary);
  }

  .search-form {
    @apply w-full max-w-screen-sm;
  }
}
</style>
