<template>
  <th scope="col" class="table-head-col">
    <slot></slot>
  </th>
</template>

<script setup lang="ts"></script>

<style lang="scss">
.table-head-col {
  @apply whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider first:pl-6 last:pr-6;
  color: var(--text-muted);
}
</style>
