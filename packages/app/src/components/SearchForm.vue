<template>
  <form class="search-form" autocomplete="off" @submit.prevent="submit">
    <search-field
      v-model:value="searchValue"
      :placeholder="t('searchForm.placeholder')"
      :error="
        v$.searchValue.$error ? v$.searchValue.$errors[0] && v$.searchValue.$errors[0].$message.toString() : undefined
      "
      :pending="isRequestPending"
    >
      <template #submit>
        <button class="submit-icon" type="submit">
          <SearchIcon aria-hidden="true" />
        </button>
      </template>
    </search-field>
  </form>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import { SearchIcon } from "@heroicons/vue/outline";
import { useVuelidate } from "@vuelidate/core";
import { or } from "@vuelidate/validators";

import SearchField from "@/components/common/SearchField.vue";

import useSearch from "@/composables/useSearch";

import { isAddress, isBlockNumber, isTransactionHash } from "@/utils/validators";

const searchValue = ref("");
const { search, isRequestPending } = useSearch();
const { t } = useI18n();

const v$ = useVuelidate(
  {
    searchValue: {
      isSearchable: or(isBlockNumber, isAddress, isTransactionHash),
    },
  },
  { searchValue },
  { $stopPropagation: true }
);

const submit = async () => {
  const validationResult = await v$.value.$validate();
  if (!validationResult) {
    return;
  }
  await search(searchValue.value);
};
</script>

<style lang="scss" scoped>
.search-form {
  .submit-icon-container {
    .submit-icon {
      @apply flex items-center justify-center w-11 h-full rounded-r-lg p-3 cursor-pointer;
      background-color: var(--accent);
      color: white;
      border: none;
      transition: background-color 100ms ease-out;

      svg {
        @apply w-5 h-5;
      }

      &:hover {
        background-color: var(--accent-hover);
      }

      &:active {
        @apply transition-none;
      }

      &:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    }
  }
}
</style>
