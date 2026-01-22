import NoAgreementWarning from "./NoAgreementWarning.vue";

import type { Meta, StoryObj } from "@storybook/vue3";

const meta: Meta<typeof NoAgreementWarning> = {
  title: "Contract/NoAgreementWarning",
  component: NoAgreementWarning,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Displays a simple warning message when a contract does not have a registered Safe Harbor Agreement.",
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof NoAgreementWarning>;

export const Default: Story = {};
