<template>
  <div class="bounty-terms-form">
    <div class="form-row">
      <label class="form-label">{{ t("safeHarbor.bountyPercentage") }}</label>
      <div class="input-with-suffix">
        <input
          v-model.number="form.bountyPercentage"
          type="number"
          :min="isLocked && originalValues ? originalValues.bountyPercentage : 1"
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
          :class="{ error: errors.bountyCapUsd || errors.bountyCapLocked }"
          @input="formatBountyCap"
        />
      </div>
      <span v-if="errors.bountyCapUsd" class="error-text">{{ errors.bountyCapUsd }}</span>
      <span v-else-if="errors.bountyCapLocked" class="error-text">{{ errors.bountyCapLocked }}</span>
    </div>

    <div class="form-row">
      <label class="form-label">{{ t("safeHarbor.identityRequirement") }}</label>
      <select v-model="form.identityRequirement" class="form-select">
        <option v-for="opt in identityOptions" :key="opt.value" :value="opt.value" :disabled="opt.disabled">
          {{ opt.label }}
        </option>
      </select>
      <span v-if="errors.identityLocked" class="error-text">{{ errors.identityLocked }}</span>
    </div>

    <div class="form-row checkbox-row">
      <label class="checkbox-label" :class="{ disabled: isLocked && originalValues?.retainable && !form.retainable }">
        <input
          v-model="form.retainable"
          type="checkbox"
          class="form-checkbox"
          :disabled="isLocked && originalValues?.retainable"
        />
        <span>{{ t("safeHarbor.retainable") }}</span>
      </label>
      <span v-if="errors.retainableLocked" class="error-text">{{ errors.retainableLocked }}</span>
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
          :class="{ error: errors.aggregateCapLocked || errors.retainableAndAggregateCap }"
          @input="formatAggregateCap"
        />
      </div>
      <span v-if="errors.retainableAndAggregateCap" class="error-text">{{ errors.retainableAndAggregateCap }}</span>
      <span v-else-if="errors.aggregateCapLocked" class="error-text">{{ errors.aggregateCapLocked }}</span>
      <span v-else class="help-text">{{ t("safeHarbor.edit.aggregateCapHelp") }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, watch } from "vue";
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
  isLocked: {
    type: Boolean,
    default: false,
  },
  originalValues: {
    type: Object as PropType<BountyTermsFormData | null>,
    default: null,
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
  bountyCapLocked: "",
  aggregateCapLocked: "",
  identityLocked: "",
  retainableLocked: "",
  retainableAndAggregateCap: "",
});

// Identity strictness levels (higher = stricter)
const identityStrictness: Record<IdentityRequirement, number> = {
  Anonymous: 0,
  Pseudonymous: 1,
  Named: 2,
};

// Check if an identity requirement is stricter than another
const isStricterIdentity = (newIdentity: IdentityRequirement, originalIdentity: IdentityRequirement): boolean => {
  return identityStrictness[newIdentity] > identityStrictness[originalIdentity];
};

// Get available identity options based on lock state
const identityOptions = computed(() => {
  const options = [
    { value: "Anonymous" as IdentityRequirement, label: t("safeHarbor.edit.identityAnonymous"), disabled: false },
    { value: "Pseudonymous" as IdentityRequirement, label: t("safeHarbor.edit.identityPseudonymous"), disabled: false },
    { value: "Named" as IdentityRequirement, label: t("safeHarbor.edit.identityNamed"), disabled: false },
  ];

  if (props.isLocked && props.originalValues) {
    const originalStrictness = identityStrictness[props.originalValues.identityRequirement];
    return options.map((opt) => ({
      ...opt,
      disabled: identityStrictness[opt.value] > originalStrictness,
    }));
  }

  return options;
});

// Check if retainable can be changed (can only go true -> true or false -> true when locked)
const canChangeRetainable = computed(() => {
  if (!props.isLocked || !props.originalValues) return true;
  // If original was true, can stay true
  // If original was false, can change to true
  // Cannot go from true to false when locked
  return props.originalValues.retainable === false || form.retainable === true;
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

    // Validate retainable + aggregate cap mutual exclusion
    const aggCapNum = parseInt(newForm.aggregateBountyCapUsd.replace(/,/g, ""), 10) || 0;
    if (newForm.retainable && aggCapNum > 0) {
      errors.retainableAndAggregateCap = t("safeHarbor.edit.cannotSetBothRetainableAndAggregateCap");
    } else {
      errors.retainableAndAggregateCap = "";
    }

    // Lock-state validations
    if (props.isLocked && props.originalValues) {
      // Check bounty percentage decrease
      if (newForm.bountyPercentage < props.originalValues.bountyPercentage) {
        errors.bountyPercentage = t("safeHarbor.edit.cannotDecreaseWhenLocked");
      }

      // Check bounty cap decrease
      const newCapNum = parseInt(newForm.bountyCapUsd.replace(/,/g, ""), 10) || 0;
      const originalCapNum = parseInt(props.originalValues.bountyCapUsd.replace(/,/g, ""), 10) || 0;
      if (newCapNum < originalCapNum) {
        errors.bountyCapLocked = t("safeHarbor.edit.cannotDecreaseWhenLocked");
      } else {
        errors.bountyCapLocked = "";
      }

      // Check aggregate cap decrease
      const newAggCapNum = parseInt(newForm.aggregateBountyCapUsd.replace(/,/g, ""), 10) || 0;
      const originalAggCapNum = parseInt(props.originalValues.aggregateBountyCapUsd.replace(/,/g, ""), 10) || 0;
      if (newAggCapNum < originalAggCapNum && newAggCapNum > 0) {
        errors.aggregateCapLocked = t("safeHarbor.edit.cannotDecreaseWhenLocked");
      } else {
        errors.aggregateCapLocked = "";
      }

      // Check identity strictness
      if (isStricterIdentity(newForm.identityRequirement, props.originalValues.identityRequirement)) {
        errors.identityLocked = t("safeHarbor.edit.cannotRestrictWhenLocked");
      } else {
        errors.identityLocked = "";
      }

      // Check retainable (cannot go from true to false)
      if (props.originalValues.retainable && !newForm.retainable) {
        errors.retainableLocked = t("safeHarbor.edit.cannotDecreaseWhenLocked");
      } else {
        errors.retainableLocked = "";
      }
    } else {
      // Clear lock-state errors when not locked
      errors.bountyCapLocked = "";
      errors.aggregateCapLocked = "";
      errors.identityLocked = "";
      errors.retainableLocked = "";
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

// Check if form has any errors
const hasErrors = computed(() => {
  return Object.values(errors).some((error) => error !== "");
});

// Expose hasErrors for parent component
defineExpose({ hasErrors });
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

  &.disabled {
    @apply cursor-not-allowed opacity-50;
  }
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
