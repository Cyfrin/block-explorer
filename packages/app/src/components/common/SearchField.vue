<template>
  <div>
    <label v-if="label && label.length" for="search" class="input-label">{{ label }}</label>
    <div class="search-input-container">
      <input
        id="search"
        v-model="model"
        :placeholder="placeholder"
        type="text"
        :disabled="disabled"
        name="search"
        class="search-input"
        :class="{ 'has-error': error && error.length }"
        spellcheck="false"
      />
      <div v-if="pending" class="spinner-container">
        <Spinner />
      </div>
      <div v-else class="submit-icon-container">
        <slot class="submit-icon" name="submit" />
      </div>
    </div>
    <div class="error-message" v-if="error && error.length">{{ t("searchForm.errorMessage") }}</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import Spinner from "@/components/common/Spinner.vue";

const props = defineProps({
  value: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  pending: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: "",
  },
});
const { t } = useI18n();
const emit = defineEmits(["update:value"]);
const model = computed({
  get: () => props.value,
  set: (value: string) => {
    emit("update:value", value.trim());
  },
});
</script>

<style scoped lang="scss">
.input-label {
  @apply block text-sm font-medium;
  color: var(--text-secondary);
}

.search-icon-container {
  @apply pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3;

  .search-icon {
    @apply z-10 h-5 w-5;
    color: var(--text-muted);
  }
}

.error-message {
  @apply absolute -bottom-5 text-xs lg:-bottom-7 lg:text-sm;
  color: var(--error);
}

.search-input-container {
  @apply relative flex items-center;

  .search-input {
    @apply block w-full truncate rounded-lg py-3 pl-4 pr-16 text-sm leading-5;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    box-shadow: var(--shadow-sm);
    transition: all 150ms ease-out;

    &::placeholder {
      color: var(--text-muted);
    }

    &:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-muted);
    }

    &:disabled {
      @apply cursor-not-allowed opacity-50;
    }
  }

  .has-error {
    border-color: var(--error);

    &:focus {
      border-color: var(--error);
      box-shadow: 0 0 0 3px var(--error-muted);
    }
  }
}

.submit-icon-container {
  @apply absolute inset-y-0 -right-px flex items-center;
}

.spinner-container {
  @apply absolute inset-y-0 right-0 flex py-2.5 pr-2.5;
}
</style>
