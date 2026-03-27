<template>
  <div class="tabs">
    <div class="tabs-header">
      <div class="tabs-list">
        <template v-for="(tab, i) in tabs">
          <button
            v-if="tab.hash"
            :key="`tab-${i}`"
            type="button"
            class="tab-button"
            :class="{ active: currentTabHash === tab.hash && tabs.length > 1 }"
            @click="setTab(tab)"
          >
            <slot v-if="$slots[`tab-${i + 1}-header`]" :name="`tab-${i + 1}-header`" />
            <template v-else>
              <span>{{ tab.title }}</span>
              <span v-if="tab.badge != null" class="tab-badge">{{ tab.badge }}</span>
              <span v-if="tab.icon" class="tab-icon">
                <component :is="tab.icon" />
              </span>
            </template>
          </button>
        </template>
      </div>
    </div>
    <div class="tabs-content">
      <div v-for="(tab, i) in tabs" :key="`tab-content-${i}`">
        <div v-show="currentTabHash === tab.hash">
          <slot :name="`tab-${i + 1}-content`" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { type PropType, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import type { FunctionalComponent } from "vue";

export type Tab = {
  title: string;
  hash: string | null;
  icon?: FunctionalComponent | null;
  badge?: string | number | null;
};

const props = defineProps({
  tabs: {
    type: Array as PropType<Tab[]>,
    required: true,
  },
  hasRoute: {
    type: Boolean,
    default: true,
  },
  hasNestedRoute: {
    type: Boolean,
    default: false,
  },
});

const route = useRoute();
const router = useRouter();

const calculateCurrrentTabHash = () => {
  let tabHash = route?.hash && props.hasRoute ? route?.hash : props.tabs[0].hash;
  if (route?.hash && route?.hash.split("#").length > 2) {
    if (props.hasNestedRoute) {
      tabHash = `#${route?.hash.split("#").at(-1)}`;
    } else {
      tabHash = `#${route?.hash.split("#").at(1)}`;
    }
  }
  return tabHash;
};
const currentTabHash = ref(calculateCurrrentTabHash());

const setTab = (tab: Tab) => {
  currentTabHash.value = tab.hash;
  if (props.hasRoute) {
    router.push({ hash: `${tab.hash}` });
  } else if (props.hasNestedRoute) {
    router.push({ hash: `#${route?.hash.split("#")[1]}${tab.hash}` });
  }
};

watchEffect(() => {
  if (props.hasRoute) {
    currentTabHash.value = calculateCurrrentTabHash();
  }
});
</script>

<style lang="scss" scoped>
.tabs {
  @apply w-full overflow-hidden rounded-lg;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);
}

.tabs-header {
  @apply p-2;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.tabs-list {
  @apply flex gap-1;
}

.tab-button {
  @apply inline-flex items-center gap-1 py-2 px-3 font-sans text-base font-medium bg-transparent border-none rounded-md cursor-pointer;
  color: var(--text-muted);
  transition: all 100ms ease-out;

  &:hover:not(.active) {
    color: var(--text-secondary);
    background-color: var(--bg-hover);
  }

  &.active {
    color: var(--text-primary);
    background-color: var(--bg-primary);
    box-shadow: var(--shadow-sm);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
}

.tab-badge {
  @apply ml-1 min-w-5 rounded px-1 text-center text-sm font-normal;
  background-color: var(--bg-tertiary);
}

.tab-icon {
  @apply flex items-center w-4 h-4;
  color: var(--success);

  svg {
    @apply w-full h-full;
  }
}

.tabs-content {
  // Padding handled by parent components per-use
}
</style>
