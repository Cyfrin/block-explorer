<template>
  <div class="not-found">
    <SearchIcon class="search-icon"></SearchIcon>
    <h1 class="title">{{ t("notFound.title") }}</h1>
    <p class="description">
      {{ t("notFound.description") }}
    </p>
    <SearchForm class="search-form"></SearchForm>
    <!-- TODO: Update to BattleChain contact URL when available -->
    <div class="contact-support">
      {{ t("notFound.contactSupportTitle") }}
      <a href="#" target="_blank">{{ t("notFound.contactSupport") }}</a>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";

import { SearchIcon } from "@heroicons/vue/outline";

import SearchForm from "@/components/SearchForm.vue";

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.not-found {
  @apply flex min-h-[calc(100vh-260px)] flex-col items-center justify-center text-center;

  .search-icon {
    @apply my-12 w-24 rounded-lg p-4;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .title {
    @apply mb-4 text-3xl sm:text-4xl;
    color: var(--text-primary);
  }

  .description {
    @apply mb-6 max-w-xl text-xl leading-6 sm:text-2xl;
    color: var(--text-secondary);
  }

  .search-form {
    @apply mb-7 w-full max-w-screen-sm;
  }

  .contact-support {
    @apply text-base;
    color: var(--text-secondary);

    a {
      color: var(--accent);

      &:hover {
        color: var(--accent-hover);
      }
    }
  }
}
</style>
