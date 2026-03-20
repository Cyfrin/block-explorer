import { ref } from "vue";

import CoveredContractsForm from "./CoveredContractsForm.vue";

import type { CoveredContractsChange } from "./CoveredContractsForm.vue";
import type { CoveredAccount } from "@/types";

export default {
  title: "Contract/CoveredContractsForm",
  component: CoveredContractsForm,
};

const Template = (args: {
  existingContracts: CoveredAccount[];
  modelValue: CoveredContractsChange;
  isLocked: boolean;
}) => ({
  components: { CoveredContractsForm },
  setup() {
    const model = ref({ ...args.modelValue });
    const onChange = (val: CoveredContractsChange) => {
      model.value = val;
      console.log("CoveredContractsChange:", JSON.stringify(val, null, 2));
    };
    return { existingContracts: args.existingContracts, model, isLocked: args.isLocked, onChange };
  },
  template: `
    <div style="max-width: 600px; padding: 16px;">
      <CoveredContractsForm
        :model-value="model"
        :existing-contracts="existingContracts"
        :is-locked="isLocked"
        @update:model-value="onChange"
      />
      <pre style="margin-top: 16px; padding: 8px; font-size: 12px; background: #f5f5f5; border-radius: 4px;">{{ JSON.stringify(model, null, 2) }}</pre>
    </div>
  `,
});

const sampleContracts: CoveredAccount[] = [
  { accountAddress: "0xabcdef1234567890abcdef1234567890abcdef12", childContractScope: 0 },
  { accountAddress: "0x1111111111111111111111111111111111111111", childContractScope: 1 },
  { accountAddress: "0x2222222222222222222222222222222222222222", childContractScope: 2 },
];

// Default state with existing contracts
export const WithExistingContracts = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
WithExistingContracts.args = {
  existingContracts: sampleContracts,
  modelValue: { toAdd: [], toRemove: [] },
  isLocked: false,
};

// No existing contracts (fresh agreement)
export const Empty = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
Empty.args = {
  existingContracts: [],
  modelValue: { toAdd: [], toRemove: [] },
  isLocked: false,
};

// Locked mode (commitment window active)
export const Locked = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
Locked.args = {
  existingContracts: sampleContracts,
  modelValue: { toAdd: [], toRemove: [] },
  isLocked: true,
};

// With some pending additions already
export const WithPendingAdditions = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
WithPendingAdditions.args = {
  existingContracts: sampleContracts,
  modelValue: {
    toAdd: [
      { accountAddress: "0x3333333333333333333333333333333333333333", childContractScope: 0 },
      { accountAddress: "0x4444444444444444444444444444444444444444", childContractScope: 2 },
    ],
    toRemove: [],
  },
  isLocked: false,
};

// With some contracts marked for removal
export const WithRemovals = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
WithRemovals.args = {
  existingContracts: sampleContracts,
  modelValue: {
    toAdd: [],
    toRemove: [sampleContracts[1].accountAddress],
  },
  isLocked: false,
};

// Mixed state: additions and removals
export const MixedState = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
MixedState.args = {
  existingContracts: sampleContracts,
  modelValue: {
    toAdd: [{ accountAddress: "0x5555555555555555555555555555555555555555", childContractScope: 1 }],
    toRemove: [sampleContracts[0].accountAddress],
  },
  isLocked: false,
};
