<template>
  <div class="network-stats">
    <div class="stats-header">
      <h2 class="stats-title">{{ t("networkStats.title") }}</h2>
      <p class="stats-subtitle">{{ subtitle }}</p>
    </div>
    <dl class="stats-grid">
      <div class="stat-item">
        <dt class="stat-label">
          <router-link :to="{ name: 'blocks' }">{{ t("networkStats.committed") }}</router-link>
        </dt>
        <dd class="stat-value">
          <ContentLoader v-if="loading" class="stat-loader" />
          <span v-else class="stat-number">{{ formatWithSpaces(committed ?? 0) }}</span>
        </dd>
      </div>
      <div class="stat-item">
        <dt class="stat-label">
          <router-link :to="{ name: 'blocks' }">{{ t("networkStats.verified") }}</router-link>
        </dt>
        <dd class="stat-value">
          <ContentLoader v-if="loading" class="stat-loader" />
          <span v-else class="stat-number">{{ formatWithSpaces(verified ?? 0) }}</span>
        </dd>
      </div>
      <div class="stat-item">
        <dt class="stat-label">
          <router-link :to="{ name: 'transactions' }">{{ t("networkStats.transactions") }}</router-link>
        </dt>
        <dd class="stat-value">
          <ContentLoader v-if="loading" class="stat-loader" />
          <span v-else class="stat-number">{{ formatWithSpaces(transactions ?? 0) }}</span>
        </dd>
      </div>
      <div v-if="totalLocked" class="stat-item">
        <dt class="stat-label">
          {{ t("networkStats.totalLocked") }}
        </dt>
        <dd class="stat-value">
          <ContentLoader v-if="loading" class="stat-loader" />
          <span v-else class="stat-number">{{ formatMoney(totalLocked) }}</span>
        </dd>
      </div>
    </dl>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import ContentLoader from "@/components/common/loaders/ContentLoader.vue";

import useContext from "@/composables/useContext";

import { formatMoney, formatWithSpaces } from "@/utils/formatters";

const { t } = useI18n();
const { currentNetwork } = useContext();

defineProps({
  loading: {
    type: Boolean,
    default: true,
  },
  committed: {
    type: Number,
  },
  verified: {
    type: Number,
  },
  transactions: {
    type: Number,
  },
  totalLocked: {
    type: Number,
  },
});

const subtitle = computed(() =>
  currentNetwork.value.name.includes("mainnet")
    ? t("networkStats.subtitleMainnet", { l2NetworkName: currentNetwork.value.l2NetworkName })
    : t("networkStats.subtitleTestnet")
);
</script>

<style scoped lang="scss">
.network-stats {
  @apply flex flex-col gap-4 p-5 rounded-lg lg:flex-row lg:items-center lg:justify-between lg:gap-8;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);
}

.stats-header {
  @apply flex-shrink-0;
}

.stats-title {
  @apply text-lg font-semibold m-0;
  color: var(--text-primary);
}

.stats-subtitle {
  @apply text-sm mt-1 mb-0 ml-0 mr-0;
  color: var(--text-muted);
}

.stats-grid {
  @apply grid grid-cols-2 gap-4 m-0 sm:flex sm:gap-6 lg:justify-end;
}

.stat-item {
  @apply flex flex-col gap-1 pr-6 sm:pr-6;

  @media (min-width: 640px) {
    border-right: 1px solid var(--border-subtle);

    &:last-child {
      @apply border-r-0 pr-0;
    }
  }
}

.stat-label {
  @apply text-sm font-medium;
  color: var(--text-muted);

  a {
    @apply no-underline;
    color: inherit;
    transition: color 100ms ease-out;

    &:hover {
      color: var(--text-secondary);
    }
  }
}

.stat-value {
  @apply m-0;
}

.stat-number {
  @apply font-mono text-xl font-semibold tabular-nums lg:text-2xl;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.stat-loader {
  @apply w-20 h-7;
}
</style>
