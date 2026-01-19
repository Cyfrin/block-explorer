<template>
  <td class="table-body-col">
    <slot></slot>
  </td>
</template>

<script setup lang="ts"></script>

<style lang="scss">
.table-body-col {
  @apply whitespace-nowrap px-4 py-2 text-sm first:font-medium md:px-2 md:first:pl-6 md:last:pr-6;
  color: var(--text-secondary);

  &:first-child {
    color: var(--text-primary);
  }
}
</style>
