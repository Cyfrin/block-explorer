<template>
  <div class="input-container">
    <input v-bind="$attrs" v-model="inputted" class="input" :class="{ 'input-error': error }" />
    <transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="error" class="input-error-icon">
        <Tooltip class="error-tooltip">
          <ExclamationCircleIcon class="icon" aria-hidden="true" />
          <template #content>{{ error }}</template>
        </Tooltip>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<script setup lang="ts">
import { computed } from "vue";

import { ExclamationCircleIcon } from "@heroicons/vue/outline";

import Tooltip from "@/components/common/Tooltip.vue";

import type { PropType } from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Number] as PropType<string[] | string | number | null>,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
});

const emit = defineEmits<{
  (eventName: "update:modelValue", value: string | number | null): void;
}>();

const inputted = computed({
  get: () => (Array.isArray(props.modelValue) ? props.modelValue[0] : props.modelValue),
  set: (value: string | number | null) => {
    emit("update:modelValue", value);
  },
});
</script>

<style lang="scss" scoped>
.input-container {
  @apply relative w-full;
}

.input {
  @apply block w-full py-2 px-3 font-sans text-base rounded-md;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-default);
  transition: all 100ms ease-out;

  &::placeholder {
    color: var(--text-faint);
  }

  &:hover:not(:disabled):not(.input-error) {
    border-color: var(--border-strong);
  }

  &:focus {
    @apply outline-none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-muted);
  }

  &:disabled {
    @apply cursor-not-allowed;
    background-color: var(--bg-tertiary);
    color: var(--text-muted);
  }

  &.input-error {
    @apply pr-8;
    border-color: var(--error);
    color: var(--error-text);

    &:focus {
      box-shadow: 0 0 0 3px var(--error-muted);
    }
  }
}

.input-error-icon {
  @apply absolute inset-0 left-auto flex items-center pr-3 pointer-events-auto;

  .error-tooltip {
    @apply flex;
  }

  .icon {
    @apply w-5 h-5;
    color: var(--error);
  }
}
</style>
