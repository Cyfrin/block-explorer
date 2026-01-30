import ContractNewDeployment from "./ContractNewDeployment.vue";

import type { Meta, StoryFn } from "@storybook/vue3";

const meta: Meta<typeof ContractNewDeployment> = {
  title: "Contract/ContractNewDeployment",
  component: ContractNewDeployment,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div style="max-width: 600px; padding: 1rem; background: var(--bg-secondary);"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "A prompt shown for contracts in NEW_DEPLOYMENT state (deployed via BattleChainDeployer but not yet in Attackable Mode). Allows contract owners to request Attackable Mode or go straight to production.",
      },
    },
  },
};

export default meta;

const contractAddress = "0xabcdef1234567890abcdef1234567890abcdef12";
const creatorAddress = "0x1234567890abcdef1234567890abcdef12345678";

export const Default: StoryFn = () => ({
  components: { ContractNewDeployment },
  template: `<ContractNewDeployment
    contract-address="${contractAddress}"
    creator-address="${creatorAddress}"
    :override-wallet-connected="false"
    :override-metamask-installed="true"
    :override-connect-pending="false"
  />`,
});
Default.storyName = "Not Connected";
Default.parameters = {
  docs: {
    description: {
      story: "Default state when wallet is not connected. Shows prompt to connect wallet.",
    },
  },
};

export const Connecting: StoryFn = () => ({
  components: { ContractNewDeployment },
  template: `<ContractNewDeployment
    contract-address="${contractAddress}"
    creator-address="${creatorAddress}"
    :override-wallet-connected="false"
    :override-metamask-installed="true"
    :override-connect-pending="true"
  />`,
});
Connecting.storyName = "Connecting";
Connecting.parameters = {
  docs: {
    description: {
      story: "State while wallet connection is in progress.",
    },
  },
};

export const WalletConnected: StoryFn = () => ({
  components: { ContractNewDeployment },
  template: `<ContractNewDeployment
    contract-address="${contractAddress}"
    creator-address="${creatorAddress}"
    :override-wallet-connected="true"
    :override-metamask-installed="true"
    :override-is-owner="true"
  />`,
});
WalletConnected.storyName = "Wallet Connected (Owner)";
WalletConnected.parameters = {
  docs: {
    description: {
      story:
        "State when wallet is connected and user is the contract owner. Shows both action buttons: Request Attackable Mode (primary) and Go to Production (secondary link).",
    },
  },
};

export const NotOwner: StoryFn = () => ({
  components: { ContractNewDeployment },
  template: `<ContractNewDeployment
    contract-address="${contractAddress}"
    creator-address="${creatorAddress}"
    :override-wallet-connected="true"
    :override-metamask-installed="true"
    :override-is-owner="false"
  />`,
});
NotOwner.storyName = "Not Owner";
NotOwner.parameters = {
  docs: {
    description: {
      story:
        "State when wallet is connected but the user is not the contract owner/deployer. Shows message that only the deployer can take action.",
    },
  },
};

export const NoWalletInstalled: StoryFn = () => ({
  components: { ContractNewDeployment },
  template: `<ContractNewDeployment
    contract-address="${contractAddress}"
    creator-address="${creatorAddress}"
    :override-wallet-connected="false"
    :override-metamask-installed="false"
    :override-connect-pending="false"
  />`,
});
NoWalletInstalled.storyName = "No Wallet Installed";
NoWalletInstalled.parameters = {
  docs: {
    description: {
      story: "State when no wallet extension (MetaMask) is detected.",
    },
  },
};
