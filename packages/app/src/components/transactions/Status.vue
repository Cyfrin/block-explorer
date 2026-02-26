<template>
  <div class="transaction-status">
    <!-- Failed -->
    <template v-if="status === 'failed'">
      <Badge size="md" data-testid="failed" color="error">
        <template #icon>
          <ExclamationCircleIcon size="xs" />
        </template>
        <span>{{ t("transactions.statusComponent.failed") }}</span>
      </Badge>
    </template>

    <template v-else>
      <!-- Execution (L2) -->
      <div class="status-group">
        <span class="status-label" data-testid="l2-badge-title">{{ t("general.execution") }}</span>
        <Badge size="md" data-testid="l2-badge-value" color="success">
          <template #icon>
            <CheckIcon size="xs" />
          </template>
          <span>{{ t("transactions.statusComponent.processed") }}</span>
        </Badge>
      </div>

      <!-- Indexing -->
      <template v-if="status === 'indexing'">
        <Badge size="md" data-testid="indexing" color="neutral">
          <template #icon>
            <Spinner size="xs" />
          </template>
          <span>{{ t("transactions.statusComponent.indexing") }}</span>
        </Badge>
      </template>

      <!-- Finality (L1) -->
      <template v-if="status !== 'indexing'">
        <div class="status-group">
          <span class="status-label" data-testid="l1-badge-title">{{ t("general.finality") }}</span>
          <Badge
            size="md"
            :data-testid="finalityBadge.testId"
            :color="finalityBadge.color"
            :class="{ 'only-desktop': finalityBadge.withDetailedPopup }"
          >
            <template #precontent v-if="finalityBadge.finishedStatuses?.length">
              <ol v-for="(finishedStatus, index) in finalityBadge.finishedStatuses" :key="index">
                <li>
                  <span class="badge-status-link">
                    <span class="badge-status-link-text"><CheckIcon />{{ finishedStatus.text }}</span>
                  </span>
                </li>
              </ol>
            </template>
            <template #icon v-if="finalityBadge.icon">
              <component :is="finalityBadge.icon" size="xs" />
            </template>
            <span>{{ finalityBadge.text }}</span>
            <template #postcontent v-if="finalityBadge.remainingStatuses?.length">
              <ol v-for="(remainingStatus, index) in finalityBadge.remainingStatuses" :key="index">
                <li>
                  <div class="badge-status-text">
                    {{ remainingStatus.text }}
                  </div>
                </li>
              </ol>
            </template>
          </Badge>
          <Badge
            v-if="finalityBadge.withDetailedPopup"
            size="md"
            :data-testid="finalityBadge.testId"
            :color="finalityBadge.color"
            class="badge-with-content only-mobile"
            @click="showStatusPopup"
          >
            <template #icon v-if="finalityBadge.icon">
              <component :is="finalityBadge.icon" size="xs" />
            </template>
            <span>{{ finalityBadge.text }}</span>
          </Badge>
          <Popup :opened="statusPopupOpened" class="status-popup" v-if="finalityBadge.withDetailedPopup">
            <OnClickOutside @trigger="closeStatusPopup">
              <div class="badge-status-popup">
                <div class="badge-status-popup-header">
                  <h3 class="badge-status-popup-title">
                    {{ t("transactions.statusComponent.ethereumNetwork") }}
                  </h3>

                  <button @click="closeStatusPopup" class="badge-status-popup-close"><XIcon /></button>
                </div>

                <div
                  class="badge-status-popup-button status-active"
                  v-for="(finishedStatus, index) in finalityBadge.finishedStatuses"
                  :key="index"
                >
                  <span class="badge-status-link">
                    <span class="badge-status-link-text"><CheckIcon />{{ finishedStatus.text }}</span>
                  </span>
                </div>

                <div class="badge-status-popup-button status-current">
                  <span class="badge-status-link-text"><Spinner></Spinner>{{ finalityBadge.text }}</span>
                </div>

                <div
                  class="badge-status-popup-button status-next"
                  v-for="(remainingStatus, index) in finalityBadge.remainingStatuses"
                  :key="index"
                >
                  {{ remainingStatus.text }}
                </div>
              </div>
            </OnClickOutside>
          </Popup>
        </div>
      </template>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, type PropType, ref } from "vue";
import { useI18n } from "vue-i18n";

import { CheckIcon, ExclamationCircleIcon, XIcon } from "@heroicons/vue/outline";
import { OnClickOutside } from "@vueuse/components";

import Badge from "@/components/common/Badge.vue";
import Popup from "@/components/common/Popup.vue";
import Spinner from "@/components/common/Spinner.vue";

import type { TransactionStatus } from "@/composables/useTransaction";

const props = defineProps({
  status: {
    type: String as PropType<TransactionStatus>,
    required: true,
  },
});

const statusPopupOpened = ref(false);

function closeStatusPopup() {
  statusPopupOpened.value = false;
}

function showStatusPopup() {
  statusPopupOpened.value = true;
}

const { t } = useI18n();

type TxStatus = {
  text: string;
};

const finishedTxStatuses: TxStatus[] = [
  {
    text: t("transactions.statusComponent.sent"),
  },
  {
    text: t("transactions.statusComponent.validated"),
  },
  {
    text: t("transactions.statusComponent.executed"),
  },
];

const remainingTxStatuses: TxStatus[] = [
  {
    text: t("transactions.statusComponent.validating"),
  },
  {
    text: t("transactions.statusComponent.executing"),
  },
];

const finalityBadge = computed(() => {
  if (props.status === "verified") {
    return {
      testId: "verified",
      color: "success" as const,
      text: t("transactions.statusComponent.executed"),
      finishedStatuses: [finishedTxStatuses[0], finishedTxStatuses[1]],
      withDetailedPopup: true,
      icon: CheckIcon,
    };
  }

  let textKey;
  const finishedStatuses: TxStatus[] = [];
  const remainingStatuses: TxStatus[] = [];

  if (props.status === "committed") {
    textKey = "validating";
    finishedStatuses.push(finishedTxStatuses[0]);
    remainingStatuses.push(remainingTxStatuses[1]);
  } else if (props.status === "proved") {
    textKey = "executing";
    finishedStatuses.push(finishedTxStatuses[0]);
    finishedStatuses.push(finishedTxStatuses[1]);
  } else {
    textKey = "sending";
    remainingStatuses.push(remainingTxStatuses[0]);
    remainingStatuses.push(remainingTxStatuses[1]);
  }

  return {
    testId: "l1-badge-value",
    color: "neutral" as const,
    text: t(`transactions.statusComponent.${textKey}`),
    icon: Spinner,
    finishedStatuses,
    remainingStatuses,
    withDetailedPopup: true,
  };
});
</script>

<style lang="scss">
.popup-container.status-popup .popup-content-wrap {
  @apply items-end;

  > div {
    @apply w-full;
  }
}

.transaction-status {
  .badge-with-content {
    .badge-container:not(.has-icon) {
      @apply p-0;

      .badge-status-link {
        @apply p-2;

        &:hover .badge-status-link-icon {
          @apply text-inherit;
        }
      }
    }

    .badge-status-link-icon {
      @apply hidden;
    }

    a,
    a:hover {
      @apply text-inherit;
    }

    &.only-desktop:hover {
      .badge-status-link-icon {
        @apply block;
      }

      .badge-container {
        @apply min-w-[7.5rem] rounded-none;

        &:first-child {
          @apply rounded-t-md;
        }

        &:last-child {
          @apply rounded-b-md;
        }
      }

      .badge-content {
        @apply w-full pr-0;
      }

      .badge-additional-content {
        @apply block;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.only-mobile {
  @apply block md:hidden;
}
.only-desktop {
  @apply hidden md:block;
}

.transaction-status {
  @apply flex flex-wrap items-center gap-4;
}

.status-group {
  @apply flex items-center gap-1;
}

.status-label {
  @apply text-sm font-medium;
  color: var(--text-muted);
}

.badge-additional-content {
  .badge-status-link-icon {
    color: var(--text-secondary);
  }

  .badge-status-link {
    @apply p-2;
  }
}

.badge-post-content {
  .badge-status-text {
    @apply p-2 pl-7;
  }
}

.badge-status-link {
  @apply flex items-center justify-between no-underline focus:outline-none;

  svg {
    @apply h-4 w-4;
  }

  &:hover .badge-status-link-icon {
    color: var(--text-primary);
  }
}

.badge-status-link-text {
  @apply flex items-center;

  svg {
    @apply mr-1;
  }
}

/*
.popup-container.status-popup .popup-content-wrap {
  @apply items-end;

  > div {
    @apply w-full;
  }
}
*/

.badge-status-popup {
  @apply mx-auto rounded-lg p-4;
  background-color: var(--bg-primary);
}

.badge-status-popup-header {
  @apply mb-4 flex items-center justify-between;
}

.badge-status-popup-close {
  @apply rounded-md p-1.5 focus:outline-none;
  background-color: var(--bg-tertiary);

  svg {
    @apply h-6 w-6;
  }

  &:hover {
    color: var(--text-primary);
  }
}
.badge-status-popup-title {
  @apply text-xl font-normal;
  color: var(--text-secondary);
}

.badge-status-popup-button {
  @apply mb-2 rounded-md text-sm;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);

  &::after {
    @apply absolute left-5 top-full h-2 w-[2px] content-[''];
    background-color: var(--bg-tertiary);
  }
  &.status-active {
    color: var(--success-text);

    &::after {
      background-color: var(--success);
    }
  }
  &.status-current {
    @apply p-2;
    color: var(--text-secondary);
  }

  &.status-next {
    @apply p-2 pl-9;
    color: var(--text-muted);
  }

  &:last-child {
    @apply mb-0;

    &::after {
      @apply content-none;
    }
  }

  .badge-status-link {
    @apply p-2 text-inherit;

    &:hover {
      @apply text-inherit;

      .badge-status-link-icon {
        color: var(--text-primary);
      }
    }
  }

  .badge-status-link-icon {
    @apply mr-0;
    color: var(--text-secondary);
  }

  svg,
  .spinner-icon {
    @apply mr-2 h-5 w-5;
  }
}
</style>
