<template>
  <div class="bounty-terms-form">
    <div class="form-row">
      <label class="form-label">{{ t("safeHarbor.bountyPercentage") }}</label>
      <div class="input-with-suffix">
        <input
          v-model.number="form.bountyPercentage"
          type="number"
          min="1"
          max="100"
          class="form-input"
          :class="{ error: errors.bountyPercentage }"
        />
        <span class="suffix">%</span>
      </div>
      <span v-if="errors.bountyPercentage" class="error-text">{{ errors.bountyPercentage }}</span>
    </div>

    <div class="form-row">
      <label class="form-label">{{ t("safeHarbor.bountyCap") }}</label>
      <div class="input-with-prefix">
        <span class="prefix">$</span>
        <input
          v-model="form.bountyCapUsd"
          type="text"
          inputmode="numeric"
          class="form-input"
          :class="{ error: errors.bountyCapUsd }"
          @input="formatBountyCap"
        />
      </div>
      <span v-if="errors.bountyCapUsd" class="error-text">{{ errors.bountyCapUsd }}</span>
    </div>

    <div class="form-row">
      <label class="form-label">{{ t("safeHarbor.identityRequirement") }}</label>
      <select v-model="form.identityRequirement" class="form-select">
        <option value="Anonymous">{{ t("safeHarbor.edit.identityAnonymous") }}</option>
        <option value="Pseudonymous">{{ t("safeHarbor.edit.identityPseudonymous") }}</option>
        <option value="Named">{{ t("safeHarbor.edit.identityNamed") }}</option>
      </select>
    </div>

    <div class="form-row checkbox-row">
      <label class="checkbox-label">
        <input v-model="form.retainable" type="checkbox" class="form-checkbox" />
        <span>{{ t("safeHarbor.retainable") }}</span>
      </label>
    </div>

    <div v-if="form.identityRequirement === 'Named'" class="form-row">
      <label class="form-label">{{ t("safeHarbor.diligenceRequirements") }}</label>
      <textarea
        v-model="form.diligenceRequirements"
        class="form-textarea"
        rows="3"
        :placeholder="t('safeHarbor.edit.diligencePlaceholder')"
      />
    </div>

    <div class="form-row">
      <label class="form-label">{{ t("safeHarbor.aggregateBountyCap") }}</label>
      <div class="input-with-prefix">
        <span class="prefix">$</span>
        <input
          v-model="form.aggregateBountyCapUsd"
          type="text"
          inputmode="numeric"
          class="form-input"
          @input="formatAggregateCap"
        />
      </div>
      <span class="help-text">{{ t("safeHarbor.edit.aggregateCapHelp") }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { IdentityRequirement } from "@/types";
import type { PropType } from "vue";

export interface BountyTermsFormData {
  bountyPercentage: number;
  bountyCapUsd: string;
  retainable: boolean;
  identityRequirement: IdentityRequirement;
  diligenceRequirements: string;
  aggregateBountyCapUsd: string;
}

const props = defineProps({
  modelValue: {
    type: Object as PropType<BountyTermsFormData>,
    required: true,
  },
});

const emit = defineEmits<{
  (e: "update:modelValue", value: BountyTermsFormData): void;
}>();

const { t } = useI18n();

const form = reactive<BountyTermsFormData>({ ...props.modelValue });

const errors = reactive({
  bountyPercentage: "",
  bountyCapUsd: "",
});

// Validate and emit on change
watch(
  form,
  (newForm) => {
    // Validate bounty percentage
    if (newForm.bountyPercentage < 1 || newForm.bountyPercentage > 100) {
      errors.bountyPercentage = t("safeHarbor.edit.bountyPercentageError");
    } else {
      errors.bountyPercentage = "";
    }

    // Validate bounty cap
    const capNum = parseInt(newForm.bountyCapUsd.replace(/,/g, ""), 10);
    if (isNaN(capNum) || capNum <= 0) {
      errors.bountyCapUsd = t("safeHarbor.edit.bountyCapError");
    } else {
      errors.bountyCapUsd = "";
    }

    emit("update:modelValue", { ...newForm });
  },
  { deep: true }
);

// Update form when prop changes
watch(
  () => props.modelValue,
  (newVal) => {
    Object.assign(form, newVal);
  },
  { deep: true }
);

const formatBountyCap = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const value = input.value.replace(/[^\d]/g, "");
  const num = parseInt(value, 10);
  if (!isNaN(num)) {
    form.bountyCapUsd = num.toLocaleString("en-US");
  } else {
    form.bountyCapUsd = "";
  }
};

const formatAggregateCap = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const value = input.value.replace(/[^\d]/g, "");
  const num = parseInt(value, 10);
  if (!isNaN(num)) {
    form.aggregateBountyCapUsd = num.toLocaleString("en-US");
  } else {
    form.aggregateBountyCapUsd = "";
  }
};
</script>

<style scoped lang="scss">
.bounty-terms-form {
  @apply space-y-4;
}

.form-row {
  @apply flex flex-col gap-1;

  &.checkbox-row {
    @apply flex-row items-center;
  }
}

.form-label {
  @apply text-xs font-medium;
  color: var(--text-muted);
}

.form-input,
.form-select,
.form-textarea {
  @apply w-full rounded-md border px-3 py-2 text-sm;
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
}

.form-select {
  @apply cursor-pointer;
}

.form-textarea {
  @apply resize-none;
}

.input-with-suffix,
.input-with-prefix {
  @apply relative flex items-center;

  .form-input {
    @apply flex-1;
  }
}

.input-with-suffix {
  .form-input {
    @apply pr-8;
  }

  .suffix {
    @apply pointer-events-none absolute right-3 z-10 text-sm;
    color: var(--text-muted);
  }
}

.input-with-prefix {
  .form-input {
    @apply pl-6;
  }

  .prefix {
    @apply pointer-events-none absolute left-3 z-10 text-sm;
    color: var(--text-muted);
  }
}

.checkbox-label {
  @apply flex cursor-pointer items-center gap-2 text-sm;
  color: var(--text-secondary);
}

.form-checkbox {
  @apply h-4 w-4 cursor-pointer rounded border;
  border-color: var(--border-default);
  accent-color: var(--accent);
}

.error-text {
  @apply text-xs;
  color: var(--error-text);
}

.help-text {
  @apply text-xs;
  color: var(--text-muted);
}
</style>
