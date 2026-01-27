import AgreementDetails from "./AgreementDetails.vue";

import type { SafeHarborAgreement } from "@/types";

export default {
  title: "Contract/AgreementDetails",
  component: AgreementDetails,
};

type Args = {
  agreement: SafeHarborAgreement;
  owner?: string | null;
  walletAddress?: string | null;
};

const Template = (args: Args) => ({
  components: { AgreementDetails },
  setup() {
    return { agreement: args.agreement, owner: args.owner, walletAddress: args.walletAddress };
  },
  template: `<AgreementDetails :agreement="agreement" :owner="owner" :wallet-address="walletAddress" />`,
});

const now = Date.now();
const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
const inOneWeek = now + 7 * 24 * 60 * 60 * 1000;

const fullAgreement: SafeHarborAgreement = {
  agreementAddress: "0x1234567890123456789012345678901234567890",
  owner: "0x1111111111111111111111111111111111111111",
  protocolName: "Example DeFi Protocol",
  bountyPercentage: 15,
  bountyCapUsd: "5000000", // $5M
  identityRequirement: "Anonymous",
  retainable: false,
  coveredContracts: [
    "0xabcdef1234567890abcdef1234567890abcdef12",
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
  ],
  contactDetails: [
    { name: "Security Team", contact: "security@example.com" },
    { name: "Discord", contact: "example-protocol" },
    { name: "Telegram", contact: "@exampleprotocol" },
  ],
  commitmentDeadline: inOneWeek,
  agreementURI: "ipfs://QmYwAPJzv5CZsnAzt8auVZRn1W2R5sHMN8LNxmhQHBvqJ4",
  registeredAt: oneMonthAgo,
  lastModified: oneWeekAgo,
};

const minimalAgreement: SafeHarborAgreement = {
  agreementAddress: "0xfedcba0987654321fedcba0987654321fedcba09",
  owner: "0x2222222222222222222222222222222222222222",
  protocolName: "Minimal Protocol",
  bountyPercentage: 10,
  bountyCapUsd: "1000000", // $1M
  identityRequirement: "Named",
  retainable: true,
  diligenceRequirements: "Must provide government ID",
  coveredContracts: ["0xcccccccccccccccccccccccccccccccccccccccc"],
  commitmentDeadline: oneWeekAgo, // Already passed - unlocked
  agreementURI: "ar://abc123",
  registeredAt: oneMonthAgo,
  lastModified: oneWeekAgo,
};

const noContactAgreement: SafeHarborAgreement = {
  agreementAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  owner: "0x3333333333333333333333333333333333333333",
  protocolName: "Anonymous Protocol",
  bountyPercentage: 20,
  bountyCapUsd: "10000000", // $10M
  identityRequirement: "Pseudonymous",
  coveredContracts: [],
  commitmentDeadline: inOneWeek,
  agreementURI: "https://example.com/agreement.pdf",
  registeredAt: oneWeekAgo,
  lastModified: oneWeekAgo,
};

export const FullDetails = Template.bind({}) as unknown as { args: Args };
FullDetails.args = {
  agreement: fullAgreement,
};

export const MinimalDetails = Template.bind({}) as unknown as { args: Args };
MinimalDetails.args = {
  agreement: minimalAgreement,
};

export const NoContactInfo = Template.bind({}) as unknown as { args: Args };
NoContactInfo.args = {
  agreement: noContactAgreement,
};

// Owner view with edit buttons visible
export const OwnerView = Template.bind({}) as unknown as { args: Args };
OwnerView.args = {
  agreement: fullAgreement,
  owner: fullAgreement.owner,
  walletAddress: fullAgreement.owner,
};

// Non-owner view (different wallet connected)
export const NonOwnerView = Template.bind({}) as unknown as { args: Args };
NonOwnerView.args = {
  agreement: fullAgreement,
  owner: fullAgreement.owner,
  walletAddress: "0x9999999999999999999999999999999999999999",
};

// No wallet connected
export const NotConnected = Template.bind({}) as unknown as { args: Args };
NotConnected.args = {
  agreement: fullAgreement,
  owner: fullAgreement.owner,
  walletAddress: null,
};
