import NoAgreementWarning from "./NoAgreementWarning.vue";

import type { Meta, StoryFn } from "@storybook/vue3";

const meta: Meta<typeof NoAgreementWarning> = {
  title: "Contract/NoAgreementWarning",
  component: NoAgreementWarning,
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
          "Displays a warning when a contract does not have a registered Safe Harbor Agreement, with options to connect wallet and create one.",
      },
    },
  },
};

export default meta;

const contractAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

export const Default: StoryFn = () => ({
  components: { NoAgreementWarning },
  template: `<NoAgreementWarning
    contract-address="${contractAddress}"
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
  components: { NoAgreementWarning },
  template: `<NoAgreementWarning
    contract-address="${contractAddress}"
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
  components: { NoAgreementWarning },
  template: `<NoAgreementWarning
    contract-address="${contractAddress}"
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
  components: { NoAgreementWarning },
  template: `<NoAgreementWarning
    contract-address="${contractAddress}"
    :override-wallet-connected="true"
  />`,
});
WalletConnected.storyName = "Wallet Connected (Owner)";
WalletConnected.parameters = {
  docs: {
    description: {
      story: "State after wallet is connected as the contract owner, showing the Create Agreement button.",
    },
  },
};

export const NotOwner: StoryFn = () => ({
  components: { NoAgreementWarning },
  template: `<NoAgreementWarning
    contract-address="${contractAddress}"
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
