import ContractNotRegistered from "./ContractNotRegistered.vue";

import type { Meta, StoryFn } from "@storybook/vue3";

const meta: Meta<typeof ContractNotRegistered> = {
  title: "Contract/ContractNotRegistered",
  component: ContractNotRegistered,
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
          "Displays a warning when a contract is not registered in the AttackRegistry, with options to connect a wallet and register the contract.",
      },
    },
  },
};

export default meta;

const contractAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

export const Default: StoryFn = () => ({
  components: { ContractNotRegistered },
  template: `<ContractNotRegistered
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
  components: { ContractNotRegistered },
  template: `<ContractNotRegistered
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
  components: { ContractNotRegistered },
  template: `<ContractNotRegistered
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
  components: { ContractNotRegistered },
  template: `<ContractNotRegistered
    contract-address="${contractAddress}"
    :override-wallet-connected="true"
  />`,
});
WalletConnected.storyName = "Wallet Connected";
WalletConnected.parameters = {
  docs: {
    description: {
      story: "State after wallet is connected, showing the Register Contract button.",
    },
  },
};

export const Registering: StoryFn = () => ({
  components: { ContractNotRegistered },
  template: `<ContractNotRegistered
    contract-address="${contractAddress}"
    :override-wallet-connected="true"
    :override-registering="true"
  />`,
});
Registering.storyName = "Registering";
Registering.parameters = {
  docs: {
    description: {
      story: "State while registration transaction is being processed.",
    },
  },
};

export const RegistrationError: StoryFn = () => ({
  components: { ContractNotRegistered },
  template: `<ContractNotRegistered
    contract-address="${contractAddress}"
    :override-wallet-connected="true"
    override-error="User rejected the transaction"
  />`,
});
RegistrationError.storyName = "Registration Error";
RegistrationError.parameters = {
  docs: {
    description: {
      story: "State when registration transaction fails.",
    },
  },
};

export const RegistrationSuccess: StoryFn = () => ({
  components: { ContractNotRegistered },
  template: `<ContractNotRegistered
    contract-address="${contractAddress}"
    :override-wallet-connected="true"
    override-tx-hash="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  />`,
});
RegistrationSuccess.storyName = "Registration Success";
RegistrationSuccess.parameters = {
  docs: {
    description: {
      story: "State after successful registration with transaction link.",
    },
  },
};
