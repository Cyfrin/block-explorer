import GoToProductionContent from "./GoToProductionContent.vue";

import type { Meta, StoryFn } from "@storybook/vue3";

const meta: Meta<typeof GoToProductionContent> = {
  title: "Contract/GoToProductionContent",
  component: GoToProductionContent,
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
          "A confirmation dialog for moving a contract directly to production, skipping the Attackable Mode security testing phase. This is the content component used inside GoToProductionModal.",
      },
    },
  },
};

export default meta;

const contractAddress = "0xabcdef1234567890abcdef1234567890abcdef12";
const txHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

// Default confirmation state
export const Default: StoryFn = () => ({
  components: { GoToProductionContent },
  template: `<GoToProductionContent
    contract-address="${contractAddress}"
    :override-processing="false"
    :override-error="null"
    :override-tx-hash="null"
  />`,
});
Default.storyName = "Default (Confirmation)";
Default.parameters = {
  docs: {
    description: {
      story:
        "Initial confirmation state showing a warning about skipping security testing, with Cancel and Go to Production buttons.",
    },
  },
};

// Processing state
export const Processing: StoryFn = () => ({
  components: { GoToProductionContent },
  template: `<GoToProductionContent
    contract-address="${contractAddress}"
    :override-processing="true"
    :override-error="null"
    :override-tx-hash="null"
  />`,
});
Processing.storyName = "Processing";
Processing.parameters = {
  docs: {
    description: {
      story: "State while the goToProduction transaction is being processed, with buttons disabled and spinner shown.",
    },
  },
};

// Error state
export const Error: StoryFn = () => ({
  components: { GoToProductionContent },
  template: `<GoToProductionContent
    contract-address="${contractAddress}"
    :override-processing="false"
    override-error="User rejected the transaction"
    :override-tx-hash="null"
  />`,
});
Error.storyName = "Error";
Error.parameters = {
  docs: {
    description: {
      story: "State when the transaction fails, showing an error message with a retry option.",
    },
  },
};

// Success state
export const Success: StoryFn = () => ({
  components: { GoToProductionContent },
  template: `<GoToProductionContent
    contract-address="${contractAddress}"
    :override-processing="false"
    :override-error="null"
    override-tx-hash="${txHash}"
  />`,
});
Success.storyName = "Success";
Success.parameters = {
  docs: {
    description: {
      story:
        "Success state after the transaction completes, showing confirmation that the contract is now in production mode.",
    },
  },
};
