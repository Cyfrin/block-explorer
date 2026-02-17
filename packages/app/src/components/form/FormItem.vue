<template>
  <component :is="tag" class="form-item">
    <component v-if="label" :is="labelTag" :for="id" class="form-item-label">
      {{ label }}<span v-if="required" class="required-indicator">*</span>
    </component>
    <slot />
    <div v-if="$slots.underline" class="form-item-underline">
      <slot name="underline" />
    </div>
  </component>
</template>

<script lang="ts" setup>
defineProps({
  tag: {
    type: String,
    default: "div",
  },
  id: {
    type: String,
  },
  label: {
    type: String,
  },
  labelTag: {
    type: String,
    default: "label",
  },
  required: {
    type: Boolean,
    default: false,
  },
});
</script>

<style lang="scss" scoped>
.form-item {
  @apply w-full;

  .form-item-label {
    @apply mb-1 block font-medium leading-snug;

    .required-indicator {
      @apply ml-0.5 text-red-500;
    }
  }
  .form-item-underline {
    @apply mt-1 text-sm;
    color: var(--text-muted);
  }
}
.label-inline-block {
  .form-item-label {
    @apply float-left;
  }
}
</style>
