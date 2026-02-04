<template>
  <div class="table-container" :class="[{ 'has-head': !!$slots['table-head'] }, { 'has-footer': !!$slots['footer'] }]">
    <div class="table-body">
      <table cellspacing="0" cellpadding="0">
        <thead v-if="$slots['table-head']">
          <tr>
            <slot name="table-head" />
          </tr>
        </thead>
        <tbody v-if="!loading">
          <slot />
          <template v-if="items?.length && $slots['table-row']">
            <tr v-for="(item, index) in items" :key="index" class="table-row">
              <slot name="table-row" :item="item" :index="index" />
            </tr>
          </template>
          <template v-else-if="$slots.empty && !items?.length && !failed">
            <slot name="empty" />
          </template>
          <template v-else-if="$slots.failed && failed">
            <slot name="failed" />
          </template>
        </tbody>
        <tbody v-else>
          <slot name="loading" />
        </tbody>
      </table>
    </div>
    <div v-if="$slots.footer" class="table-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from "vue";

defineProps({
  items: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: Array as PropType<any[] | null>,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: true,
  },
  failed: {
    type: Boolean,
    default: false,
  },
});
</script>

<style lang="scss">
.table-container {
  @apply w-full overflow-hidden rounded-lg;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);

  .table-body {
    @apply w-full overflow-x-auto;

    // Hide header on mobile, show on md+
    & > table > thead tr {
      @apply absolute left-[-9999px] top-[-9999px] md:relative md:left-0 md:top-0;
    }
  }

  // Header border radius
  &.has-head {
    table thead tr th {
      &:first-child {
        @apply rounded-tl-lg;
      }
      &:last-child {
        @apply rounded-tr-lg;
      }
    }
  }

  // Body border radius when no header
  &:not(.has-head) {
    table tbody tr:first-child td {
      &:first-child {
        @apply rounded-tl-lg;
      }
      &:last-child {
        @apply rounded-tr-lg;
      }
    }
  }

  // Footer border radius
  &:not(.has-footer) {
    .table-body {
      @apply rounded-b-lg;
    }

    table tbody tr:last-child td {
      &:first-child {
        @apply rounded-bl-lg;
      }
      &:last-child {
        @apply rounded-br-lg;
      }
    }
  }

  table {
    @apply w-full border-collapse;
    border-spacing: 0;

    thead {
      tr th {
        @apply py-3 px-4 text-left text-sm font-medium whitespace-nowrap;
        background-color: var(--bg-tertiary);
        color: var(--text-muted);
        border-bottom: 1px solid var(--border-default);
      }
    }

    tbody {
      tr {
        transition: background-color 100ms ease-out;

        &:not(:last-child) {
          border-bottom: 1px solid var(--border-subtle);
        }

        // Alternating row colors
        &:nth-child(odd) {
          background-color: var(--bg-primary);
        }

        &:nth-child(even) {
          background-color: var(--bg-secondary);
        }

        // Hover state (can be disabled with .no-hover on table-container)
        &:hover {
          background-color: var(--bg-hover);
        }

        td {
          @apply py-3 px-4 text-base align-middle;
          color: var(--text-secondary);

          // Data values in monospace
          &.data-cell {
            @apply font-mono text-sm tabular-nums;
            color: var(--text-primary);
          }
        }
      }
    }
  }

  .table-footer {
    @apply w-full py-3 px-4 rounded-b-lg;
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--border-subtle);
  }

  // Disable hover for info tables (non-interactive rows)
  &.no-hover {
    table tbody tr {
      &:nth-child(odd):hover {
        background-color: var(--bg-primary);
      }
      &:nth-child(even):hover {
        background-color: var(--bg-secondary);
      }
    }
  }
}
</style>
