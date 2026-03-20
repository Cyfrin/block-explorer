<template>
  <div class="covered-contracts-form">
    <!-- Current contracts as removable chips -->
    <div v-if="form.existingContracts.length > 0" class="existing-contracts">
      <span class="section-label">{{ t("safeHarbor.edit.currentContracts") }}</span>
      <div v-if="isLocked" class="locked-note">
        {{ t("safeHarbor.edit.cannotRemoveWhenLocked") }}
      </div>
      <div class="contracts-list">
        <div
          v-for="address in form.existingContracts"
          :key="address"
          class="contract-chip"
          :class="{ 'to-remove': form.toRemove.includes(address) }"
        >
          <span class="address">{{ shortValue(address) }}</span>
          <!-- Hide remove/undo buttons when locked -->
          <template v-if="!isLocked">
            <button
              v-if="!form.toRemove.includes(address)"
              @click="markForRemoval(address)"
              class="btn-chip-action remove"
              :title="t('safeHarbor.edit.markForRemoval')"
            >
              <XIcon class="icon" />
            </button>
            <button
              v-else
              @click="unmarkForRemoval(address)"
              class="btn-chip-action undo"
              :title="t('safeHarbor.edit.undoRemoval')"
            >
              <RefreshIcon class="icon" />
            </button>
          </template>
        </div>
      </div>
      <div v-if="form.toRemove.length > 0 && !isLocked" class="removal-note">
        {{ t("safeHarbor.edit.contractsToRemove", { count: form.toRemove.length }) }}
      </div>
    </div>

    <!-- Add new contracts -->
    <div class="add-contracts">
      <span class="section-label">{{ t("safeHarbor.edit.addContracts") }}</span>
      <div class="add-input-row">
        <input
          v-model="newAddress"
          type="text"
          class="form-input"
          :class="{ error: addressError }"
          :placeholder="t('safeHarbor.edit.addressPlaceholder')"
          @keyup.enter="addContract"
        />
        <select v-model.number="newChildScope" class="scope-select">
          <option :value="0">{{ t("safeHarbor.createAgreement.scopeNone") }}</option>
          <option :value="1">{{ t("safeHarbor.createAgreement.scopeExisting") }}</option>
          <option :value="2">{{ t("safeHarbor.createAgreement.scopeAll") }}</option>
          <option :value="3">{{ t("safeHarbor.createAgreement.scopeFuture") }}</option>
        </select>
        <button @click="addContract" class="btn-add" :disabled="!isValidAddress">
          <PlusIcon class="icon" />
        </button>
      </div>
      <span v-if="addressError" class="error-text">{{ addressError }}</span>

      <!-- Pending additions -->
      <div v-if="form.toAdd.length > 0" class="pending-additions">
        <div v-for="(account, index) in form.toAdd" :key="account.accountAddress" class="contract-row new">
          <span class="address">{{ shortValue(account.accountAddress) }}</span>
          <select v-model.number="account.childContractScope" class="scope-select scope-select-sm">
            <option :value="0">{{ t("safeHarbor.createAgreement.scopeNone") }}</option>
            <option :value="1">{{ t("safeHarbor.createAgreement.scopeExisting") }}</option>
            <option :value="2">{{ t("safeHarbor.createAgreement.scopeAll") }}</option>
            <option :value="3">{{ t("safeHarbor.createAgreement.scopeFuture") }}</option>
          </select>
          <button @click="removeFromPending(index)" class="btn-chip-action remove" :title="t('common.remove')">
            <XIcon class="icon" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { PlusIcon, RefreshIcon, XIcon } from "@heroicons/vue/solid";

import type { Address } from "@/types";
import type { PropType } from "vue";

import { shortValue } from "@/utils/formatters";

export interface AccountToAdd {
  accountAddress: string;
  childContractScope: number;
}

export interface CoveredContractsChange {
  toAdd: AccountToAdd[];
  toRemove: Address[];
}

const props = defineProps({
  existingContracts: {
    type: Array as PropType<Address[]>,
    default: () => [],
  },
  modelValue: {
    type: Object as PropType<CoveredContractsChange>,
    required: true,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (e: "update:modelValue", value: CoveredContractsChange): void;
}>();

const { t } = useI18n();

const form = reactive({
  existingContracts: [...props.existingContracts],
  toAdd: [...props.modelValue.toAdd] as AccountToAdd[],
  toRemove: [...props.modelValue.toRemove],
});

const newAddress = ref("");
const newChildScope = ref(0);
const addressError = ref("");

const isValidAddress = computed(() => {
  const addr = newAddress.value.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
});

// Emit changes
watch(
  () => ({ toAdd: form.toAdd, toRemove: form.toRemove }),
  (newVal) => {
    emit("update:modelValue", {
      toAdd: newVal.toAdd.map((a) => ({ ...a })),
      toRemove: [...newVal.toRemove],
    });
  },
  { deep: true }
);

// Update form when props change
watch(
  () => props.existingContracts,
  (newVal) => {
    form.existingContracts = [...newVal];
  },
  { deep: true }
);

watch(
  () => props.modelValue,
  (newVal) => {
    // Guard against infinite loop: only update if values actually differ
    const toAddChanged =
      newVal.toAdd.length !== form.toAdd.length ||
      newVal.toAdd.some(
        (a, i) =>
          a.accountAddress !== form.toAdd[i]?.accountAddress ||
          a.childContractScope !== form.toAdd[i]?.childContractScope
      );
    const toRemoveChanged =
      newVal.toRemove.length !== form.toRemove.length || newVal.toRemove.some((addr, i) => addr !== form.toRemove[i]);

    if (toAddChanged) {
      form.toAdd = newVal.toAdd.map((a) => ({ ...a }));
    }
    if (toRemoveChanged) {
      form.toRemove = [...newVal.toRemove];
    }
  },
  { deep: true }
);

const addContract = () => {
  addressError.value = "";
  const addr = newAddress.value.trim();

  if (!addr) return;

  if (!isValidAddress.value) {
    addressError.value = t("safeHarbor.edit.invalidAddress");
    return;
  }

  // Check if already exists
  if (form.existingContracts.includes(addr) || form.toAdd.some((a) => a.accountAddress === addr)) {
    addressError.value = t("safeHarbor.edit.addressAlreadyExists");
    return;
  }

  form.toAdd.push({ accountAddress: addr, childContractScope: newChildScope.value });
  newAddress.value = "";
  newChildScope.value = 0;
};

const removeFromPending = (index: number) => {
  form.toAdd.splice(index, 1);
};

const markForRemoval = (address: Address) => {
  if (!form.toRemove.includes(address)) {
    form.toRemove.push(address);
  }
};

const unmarkForRemoval = (address: Address) => {
  const index = form.toRemove.indexOf(address);
  if (index > -1) {
    form.toRemove.splice(index, 1);
  }
};
</script>

<style scoped lang="scss">
.covered-contracts-form {
  @apply space-y-4;
}

.section-label {
  @apply mb-2 block text-xs font-medium;
  color: var(--text-muted);
}

.existing-contracts {
  @apply space-y-2;
}

.locked-note {
  @apply text-xs italic;
  color: var(--text-muted);
}

.contracts-list {
  @apply flex flex-wrap gap-2;
}

.contract-chip {
  @apply flex items-center gap-1 rounded-md px-2 py-1 text-sm;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);

  &.to-remove {
    @apply line-through opacity-50;
    background-color: var(--error-muted);
  }

  .address {
    @apply font-mono text-xs;
  }
}

.contract-row {
  @apply flex items-center gap-2 rounded-md px-2 py-1.5;

  &.new {
    background-color: var(--success-muted);
    color: var(--success-text);
  }

  .address {
    @apply flex-1 font-mono text-xs;
  }
}

.btn-chip-action {
  @apply ml-1 rounded p-0.5 transition-colors;
  color: var(--text-muted);

  &.remove:hover {
    color: var(--error-text);
    background-color: var(--error-muted);
  }

  &.undo:hover {
    color: var(--success-text);
    background-color: var(--success-muted);
  }

  .icon {
    @apply h-3 w-3;
  }
}

.removal-note {
  @apply text-xs;
  color: var(--error-text);
}

.add-contracts {
  @apply space-y-2;
}

.add-input-row {
  @apply flex gap-2;
}

.form-input {
  @apply flex-1 rounded-md border px-3 py-2 font-mono text-sm;
  border-color: var(--border-default);
  background-color: var(--bg-primary);
  color: var(--text-primary);

  &:focus {
    @apply outline-none ring-2;
    ring-color: var(--accent);
    border-color: var(--accent);
  }

  &.error {
    border-color: var(--error);
  }

  &::placeholder {
    color: var(--text-muted);
    font-family: inherit;
  }
}

.scope-select {
  @apply cursor-pointer rounded-md border px-2 py-2 text-xs;
  border-color: var(--border-default);
  background-color: var(--bg-primary);
  color: var(--text-primary);

  &:focus {
    @apply outline-none ring-2;
    ring-color: var(--accent);
    border-color: var(--accent);
  }
}

.scope-select-sm {
  @apply py-1;
}

.btn-add {
  @apply flex-shrink-0 rounded-md px-3 py-2 transition-colors;
  background-color: var(--accent);
  color: white;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    @apply cursor-not-allowed opacity-50;
  }

  .icon {
    @apply h-4 w-4;
  }
}

.error-text {
  @apply text-xs;
  color: var(--error-text);
}

.pending-additions {
  @apply mt-2 space-y-1;
}
</style>
