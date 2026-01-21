import AgreementDetails from "./AgreementDetails.vue";

import type { SafeHarborAgreement } from "@/types";

export default {
  title: "Contract/AgreementDetails",
  component: AgreementDetails,
};

// Use serializable args (string for bountyCap) to avoid BigInt serialization issues
type SerializableAgreement = Omit<SafeHarborAgreement, "bountyCap"> & { bountyCap: string };

type Args = {
  agreement: SerializableAgreement;
};

const Template = (args: Args) => ({
  components: { AgreementDetails },
  setup() {
    // Convert string bountyCap to BigInt inside setup
    const agreement: SafeHarborAgreement = {
      ...args.agreement,
      bountyCap: BigInt(args.agreement.bountyCap),
    };
    return { agreement };
  },
  template: `<AgreementDetails :agreement="agreement" />`,
});

const now = Date.now();
const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
const inOneWeek = now + 7 * 24 * 60 * 60 * 1000;

const fullAgreement: SerializableAgreement = {
  agreementAddress: "0x1234567890123456789012345678901234567890",
  protocolName: "Example DeFi Protocol",
  bountyPercentage: 15,
  bountyCap: "5000000000000", // $5M USDC
  bountyCapToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  allowAnonymous: true,
  coveredContracts: [
    "0xabcdef1234567890abcdef1234567890abcdef12",
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
  ],
  contactEmail: "security@example.com",
  contactDiscord: "example-protocol",
  contactTelegram: "@exampleprotocol",
  assetRecoveryAddress: "0x9999999999999999999999999999999999999999",
  commitmentDeadline: inOneWeek,
  agreementURI: "ipfs://QmYwAPJzv5CZsnAzt8auVZRn1W2R5sHMN8LNxmhQHBvqJ4",
  registeredAt: oneMonthAgo,
  lastModified: oneWeekAgo,
};

const minimalAgreement: SerializableAgreement = {
  agreementAddress: "0xfedcba0987654321fedcba0987654321fedcba09",
  protocolName: "Minimal Protocol",
  bountyPercentage: 10,
  bountyCap: "1000000000000", // $1M USDC
  allowAnonymous: false,
  coveredContracts: ["0xcccccccccccccccccccccccccccccccccccccccc"],
  assetRecoveryAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  commitmentDeadline: oneWeekAgo, // Already passed - unlocked
  agreementURI: "ar://abc123",
  registeredAt: oneMonthAgo,
  lastModified: oneWeekAgo,
};

const noContactAgreement: SerializableAgreement = {
  agreementAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  protocolName: "Anonymous Protocol",
  bountyPercentage: 20,
  bountyCap: "10000000000000", // $10M USDC
  allowAnonymous: true,
  coveredContracts: [],
  assetRecoveryAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
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
