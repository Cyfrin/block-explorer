<template>
  <div class="state-container">
    <div class="state-image">
      <slot name="image">
        <SearchIcon class="search-icon" />
      </slot>
    </div>
    <div class="state-text-container">
      <div class="title">
        <slot name="title">Not found</slot>
      </div>
      <div class="description">
        <slot name="description">Please, try again later</slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { SearchIcon } from "@heroicons/vue/solid";
</script>

<style scoped lang="scss">
.state-container {
  @apply flex whitespace-normal;

  .state-image {
    @apply flex h-16 min-w-[4rem] rounded-lg sm:h-20 sm:w-20;
    background-color: var(--bg-tertiary);

    .search-icon {
      @apply m-auto h-10 w-10;
      color: var(--text-muted);
    }
  }

  .state-text-container {
    @apply ml-6 text-left sm:ml-9;

    .title {
      @apply mb-1 text-sm font-semibold sm:text-lg;
      color: var(--text-primary);
    }

    .description {
      @apply text-xs sm:text-sm;
      color: var(--text-muted);
    }
  }
}
</style>
