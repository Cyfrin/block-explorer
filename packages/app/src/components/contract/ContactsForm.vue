<template>
  <div class="contacts-form">
    <div v-for="(contact, index) in form.contacts" :key="index" class="contact-row">
      <div class="contact-inputs">
        <input
          v-model="contact.name"
          type="text"
          class="form-input name-input"
          :placeholder="t('safeHarbor.edit.contactNamePlaceholder')"
        />
        <input
          v-model="contact.contact"
          type="text"
          class="form-input contact-input"
          :placeholder="t('safeHarbor.edit.contactValuePlaceholder')"
        />
      </div>
      <button
        @click="removeContact(index)"
        class="btn-remove"
        :title="t('safeHarbor.edit.removeContact')"
        :disabled="form.contacts.length <= 1"
      >
        <TrashIcon class="icon" />
      </button>
    </div>

    <button @click="addContact" class="btn-add">
      <PlusIcon class="icon" />
      {{ t("safeHarbor.edit.addContact") }}
    </button>
  </div>
</template>

<script lang="ts" setup>
import { reactive, watch } from "vue";
import { useI18n } from "vue-i18n";

import { PlusIcon, TrashIcon } from "@heroicons/vue/solid";

import type { ContactDetail } from "@/types";
import type { PropType } from "vue";

const props = defineProps({
  modelValue: {
    type: Array as PropType<ContactDetail[]>,
    required: true,
  },
});

const emit = defineEmits<{
  (e: "update:modelValue", value: ContactDetail[]): void;
}>();

const { t } = useI18n();

const form = reactive({
  contacts: props.modelValue.length > 0 ? [...props.modelValue] : [{ name: "", contact: "" }],
});

// Emit on change
watch(
  () => form.contacts,
  (newContacts) => {
    // Filter out completely empty contacts before emitting
    const validContacts = newContacts.filter((c) => c.name.trim() || c.contact.trim());
    emit("update:modelValue", validContacts.length > 0 ? validContacts : newContacts);
  },
  { deep: true }
);

// Update form when prop changes (only if actually different to avoid infinite loop)
watch(
  () => props.modelValue,
  (newVal) => {
    const incoming = newVal.length > 0 ? newVal : [{ name: "", contact: "" }];
    if (
      incoming.length !== form.contacts.length ||
      incoming.some((c, i) => c.name !== form.contacts[i]?.name || c.contact !== form.contacts[i]?.contact)
    ) {
      form.contacts = [...incoming];
    }
  },
  { deep: true }
);

const addContact = () => {
  form.contacts.push({ name: "", contact: "" });
};

const removeContact = (index: number) => {
  if (form.contacts.length > 1) {
    form.contacts.splice(index, 1);
  }
};
</script>

<style scoped lang="scss">
.contacts-form {
  @apply space-y-3;
}

.contact-row {
  @apply flex items-start gap-2;
}

.contact-inputs {
  @apply flex flex-1 flex-col gap-2 sm:flex-row;
}

.form-input {
  @apply flex-1 rounded-md border px-3 py-2 text-sm;
  border-color: var(--border-default);
  background-color: var(--bg-primary);
  color: var(--text-primary);

  &:focus {
    @apply outline-none ring-2;
    ring-color: var(--accent);
    border-color: var(--accent);
  }

  &::placeholder {
    color: var(--text-muted);
  }
}

.name-input {
  @apply sm:max-w-[140px];
}

.btn-remove {
  @apply flex-shrink-0 rounded p-2 transition-colors;
  color: var(--text-muted);

  &:hover:not(:disabled) {
    color: var(--error-text);
    background-color: var(--error-muted);
  }

  &:disabled {
    @apply cursor-not-allowed opacity-30;
  }

  .icon {
    @apply h-4 w-4;
  }
}

.btn-add {
  @apply flex items-center gap-1.5 rounded-md border border-dashed px-3 py-2 text-sm transition-colors;
  border-color: var(--border-default);
  color: var(--text-muted);

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
    background-color: var(--bg-tertiary);
  }

  .icon {
    @apply h-4 w-4;
  }
}
</style>
