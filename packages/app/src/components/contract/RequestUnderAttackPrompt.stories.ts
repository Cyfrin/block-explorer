import RequestUnderAttackPrompt from "./RequestUnderAttackPrompt.vue";

import type { Meta, StoryFn } from "@storybook/vue3";

const meta: Meta<typeof RequestUnderAttackPrompt> = {
  title: "Contract/RequestUnderAttackPrompt",
  component: RequestUnderAttackPrompt,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div style="max-width: 600px;"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Displays a prompt for contract owners to enter Attackable Mode when a contract is registered and has a Safe Harbor agreement. Attackable Mode allows ethical hackers to stress test the contract.",
      },
    },
  },
};

export default meta;

const contractAddress = "0xabcdef1234567890abcdef1234567890abcdef12";
const agreementAddress = "0x1234567890abcdef1234567890abcdef12345678";

export const Default: StoryFn = () => ({
  components: { RequestUnderAttackPrompt },
  template: `<RequestUnderAttackPrompt
    contract-address="${contractAddress}"
    agreement-address="${agreementAddress}"
    :override-wallet-connected="false"
    :override-metamask-installed="true"
  />`,
});
Default.storyName = "Wallet Not Connected";
Default.parameters = {
  docs: {
    description: {
      story: "Default state when no wallet is connected. Shows prompt to connect wallet.",
    },
  },
};

export const Connecting: StoryFn = () => ({
  components: { RequestUnderAttackPrompt },
  template: `<RequestUnderAttackPrompt
    contract-address="${contractAddress}"
    agreement-address="${agreementAddress}"
    :override-wallet-connected="false"
    :override-metamask-installed="true"
    :override-connect-pending="true"
  />`,
});
Connecting.storyName = "Connecting Wallet";
Connecting.parameters = {
  docs: {
    description: {
      story: "State while wallet connection is in progress.",
    },
  },
};

export const NoWalletDetected: StoryFn = () => ({
  components: { RequestUnderAttackPrompt },
  template: `<RequestUnderAttackPrompt
    contract-address="${contractAddress}"
    agreement-address="${agreementAddress}"
    :override-wallet-connected="false"
    :override-metamask-installed="false"
  />`,
});
NoWalletDetected.storyName = "No Wallet Detected";
NoWalletDetected.parameters = {
  docs: {
    description: {
      story: "State when MetaMask or compatible wallet is not installed.",
    },
  },
};

export const WalletConnected: StoryFn = () => ({
  components: { RequestUnderAttackPrompt },
  template: `<RequestUnderAttackPrompt
    contract-address="${contractAddress}"
    agreement-address="${agreementAddress}"
    :override-wallet-connected="true"
  />`,
});
WalletConnected.storyName = "Wallet Connected";
WalletConnected.parameters = {
  docs: {
    description: {
      story: "State after wallet is connected, showing the Enter Attackable Mode button.",
    },
  },
};

export const Requesting: StoryFn = () => ({
  components: { RequestUnderAttackPrompt },
  template: `<RequestUnderAttackPrompt
    contract-address="${contractAddress}"
    agreement-address="${agreementAddress}"
    :override-wallet-connected="true"
    :override-requesting="true"
  />`,
});
Requesting.storyName = "Requesting";
Requesting.parameters = {
  docs: {
    description: {
      story: "State while Attackable Mode request transaction is being processed.",
    },
  },
};

export const RequestError: StoryFn = () => ({
  components: { RequestUnderAttackPrompt },
  template: `<RequestUnderAttackPrompt
    contract-address="${contractAddress}"
    agreement-address="${agreementAddress}"
    :override-wallet-connected="true"
    override-error="User rejected the transaction"
  />`,
});
RequestError.storyName = "Request Error";
RequestError.parameters = {
  docs: {
    description: {
      story: "State when Attackable Mode request transaction fails.",
    },
  },
};

export const RequestSuccess: StoryFn = () => ({
  components: { RequestUnderAttackPrompt },
  template: `<RequestUnderAttackPrompt
    contract-address="${contractAddress}"
    agreement-address="${agreementAddress}"
    :override-wallet-connected="true"
    override-tx-hash="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  />`,
});
RequestSuccess.storyName = "Request Success";
RequestSuccess.parameters = {
  docs: {
    description: {
      story: "State after successful request with transaction link.",
    },
  },
};

export const NotOwner: StoryFn = () => ({
  components: { RequestUnderAttackPrompt },
  template: `<RequestUnderAttackPrompt
    contract-address="${contractAddress}"
    agreement-address="${agreementAddress}"
    creator-address="0x9876543210987654321098765432109876543210"
    :override-wallet-connected="true"
    :override-is-owner="false"
  />`,
});
NotOwner.storyName = "Not Contract Owner";
NotOwner.parameters = {
  docs: {
    description: {
      story: "State when wallet is connected but is not the contract deployer/owner.",
    },
  },
};
