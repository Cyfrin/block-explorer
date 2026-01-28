import CreateAgreementContent from "./CreateAgreementContent.vue";

import type { Meta, StoryFn } from "@storybook/vue3";

const meta: Meta<typeof CreateAgreementContent> = {
  title: "Contract/CreateAgreementContent",
  component: CreateAgreementContent,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template:
        '<div style="display: flex; justify-content: center; padding: 1rem; background: var(--bg-secondary);"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "A two-step wizard for creating and adopting a Safe Harbor Agreement. Step 1 creates the agreement contract, Step 2 adopts it in the registry. This is the content component used inside CreateAgreementModal.",
      },
    },
  },
};

export default meta;

const contractAddress = "0xabcdef1234567890abcdef1234567890abcdef12";
const agreementAddress = "0x1234567890abcdef1234567890abcdef12345678";
const txHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

export const Step1Default: StoryFn = () => ({
  components: { CreateAgreementContent },
  template: `<CreateAgreementContent
    contract-address="${contractAddress}"
    :override-step="1"
  />`,
});
Step1Default.storyName = "Step 1: Form (Empty)";
Step1Default.parameters = {
  docs: {
    description: {
      story:
        "Initial state showing the agreement details form with empty required fields. The submit button is disabled until all required fields are filled.",
    },
  },
};

export const Step1Creating: StoryFn = () => ({
  components: { CreateAgreementContent },
  template: `<CreateAgreementContent
    contract-address="${contractAddress}"
    :override-step="1"
    :override-creating="true"
  />`,
});
Step1Creating.storyName = "Step 1: Creating Agreement";
Step1Creating.parameters = {
  docs: {
    description: {
      story: "State while the create agreement transaction is being processed.",
    },
  },
};

export const Step1Error: StoryFn = () => ({
  components: { CreateAgreementContent },
  template: `<CreateAgreementContent
    contract-address="${contractAddress}"
    :override-step="1"
    override-create-error="User rejected the transaction"
  />`,
});
Step1Error.storyName = "Step 1: Error";
Step1Error.parameters = {
  docs: {
    description: {
      story: "State when the create agreement transaction fails.",
    },
  },
};

export const Step2Default: StoryFn = () => ({
  components: { CreateAgreementContent },
  template: `<CreateAgreementContent
    contract-address="${contractAddress}"
    :override-step="2"
    override-agreement-address="${agreementAddress}"
    override-create-tx-hash="${txHash}"
  />`,
});
Step2Default.storyName = "Step 2: Adopt Agreement";
Step2Default.parameters = {
  docs: {
    description: {
      story: "State after agreement is created, ready to adopt it in the registry.",
    },
  },
};

export const Step2Adopting: StoryFn = () => ({
  components: { CreateAgreementContent },
  template: `<CreateAgreementContent
    contract-address="${contractAddress}"
    :override-step="2"
    override-agreement-address="${agreementAddress}"
    override-create-tx-hash="${txHash}"
    :override-adopting="true"
  />`,
});
Step2Adopting.storyName = "Step 2: Adopting";
Step2Adopting.parameters = {
  docs: {
    description: {
      story: "State while the adopt agreement transaction is being processed.",
    },
  },
};

export const Step2Error: StoryFn = () => ({
  components: { CreateAgreementContent },
  template: `<CreateAgreementContent
    contract-address="${contractAddress}"
    :override-step="2"
    override-agreement-address="${agreementAddress}"
    override-create-tx-hash="${txHash}"
    override-adopt-error="User rejected the transaction"
  />`,
});
Step2Error.storyName = "Step 2: Error";
Step2Error.parameters = {
  docs: {
    description: {
      story: "State when the adopt agreement transaction fails.",
    },
  },
};

export const Complete: StoryFn = () => ({
  components: { CreateAgreementContent },
  template: `<CreateAgreementContent
    contract-address="${contractAddress}"
    :override-step="3"
    override-agreement-address="${agreementAddress}"
    override-create-tx-hash="${txHash}"
    override-adopt-tx-hash="${txHash}"
  />`,
});
Complete.storyName = "Complete";
Complete.parameters = {
  docs: {
    description: {
      story: "Success state after both transactions complete.",
    },
  },
};
