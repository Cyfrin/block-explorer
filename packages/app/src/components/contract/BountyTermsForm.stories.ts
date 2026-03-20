import { ref } from "vue";

import BountyTermsForm from "./BountyTermsForm.vue";

import type { BountyTermsFormData } from "./BountyTermsForm.vue";

export default {
  title: "Contract/BountyTermsForm",
  component: BountyTermsForm,
};

const Template = (args: {
  modelValue: BountyTermsFormData;
  isLocked: boolean;
  originalValues: BountyTermsFormData | null;
}) => ({
  components: { BountyTermsForm },
  setup() {
    const model = ref({ ...args.modelValue });
    const onChange = (val: BountyTermsFormData) => {
      model.value = val;
      console.log("BountyTerms:", JSON.stringify(val, null, 2));
    };
    return { model, isLocked: args.isLocked, originalValues: args.originalValues, onChange };
  },
  template: `
    <div style="max-width: 400px; padding: 16px;">
      <BountyTermsForm
        :model-value="model"
        :is-locked="isLocked"
        :original-values="originalValues"
        @update:model-value="onChange"
      />
      <pre style="margin-top: 16px; padding: 8px; font-size: 12px; background: #f5f5f5; border-radius: 4px;">{{ JSON.stringify(model, null, 2) }}</pre>
    </div>
  `,
});

const defaultTerms: BountyTermsFormData = {
  bountyPercentage: 15,
  bountyCapUsd: "5,000,000",
  retainable: false,
  identityRequirement: "Anonymous",
  diligenceRequirements: "",
  aggregateBountyCapUsd: "",
};

// Default unlocked state
export const Default = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
Default.args = {
  modelValue: defaultTerms,
  isLocked: false,
  originalValues: null,
};

// Locked state (commitment window active — can only make whitehat-friendlier changes)
export const Locked = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
Locked.args = {
  modelValue: defaultTerms,
  isLocked: true,
  originalValues: defaultTerms,
};

// Named identity (shows diligence requirements field)
export const NamedIdentity = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
NamedIdentity.args = {
  modelValue: {
    ...defaultTerms,
    identityRequirement: "Named",
    diligenceRequirements: "Must provide government-issued ID",
  },
  isLocked: false,
  originalValues: null,
};

// Retainable enabled
export const Retainable = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
Retainable.args = {
  modelValue: {
    ...defaultTerms,
    retainable: true,
  },
  isLocked: false,
  originalValues: null,
};

// Conflict: retainable + aggregate cap (should show validation error)
export const RetainableWithAggregateCap = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
RetainableWithAggregateCap.args = {
  modelValue: {
    ...defaultTerms,
    retainable: true,
    aggregateBountyCapUsd: "10,000,000",
  },
  isLocked: false,
  originalValues: null,
};
