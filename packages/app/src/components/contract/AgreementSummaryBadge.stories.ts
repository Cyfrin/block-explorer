import AgreementSummaryBadge from "./AgreementSummaryBadge.vue";

import type { SafeHarborAgreement } from "@/types";

export default {
  title: "Contract/AgreementSummaryBadge",
  component: AgreementSummaryBadge,
};

// Use serializable args (string for bountyCap) to avoid BigInt serialization issues
type SerializableAgreement = Omit<SafeHarborAgreement, "bountyCap"> & { bountyCap: string };

type Args = {
  agreement: SerializableAgreement | null;
  hasAgreement: boolean;
  linkToTab: boolean;
};

const Template = (args: Args) => ({
  components: { AgreementSummaryBadge },
  setup() {
    // Convert string bountyCap to BigInt inside setup
    const agreement: SafeHarborAgreement | null = args.agreement
      ? {
          ...args.agreement,
          bountyCap: BigInt(args.agreement.bountyCap),
        }
      : null;
    return { agreement, hasAgreement: args.hasAgreement, linkToTab: args.linkToTab };
  },
  template: `<AgreementSummaryBadge :agreement="agreement" :hasAgreement="hasAgreement" :linkToTab="linkToTab" />`,
});

const mockAgreement: SerializableAgreement = {
  agreementAddress: "0x1234567890123456789012345678901234567890",
  protocolName: "Example Protocol",
  bountyPercentage: 15,
  bountyCap: "5000000000000", // $5M USDC (6 decimals)
  allowAnonymous: true,
  coveredContracts: ["0xabcdef1234567890abcdef1234567890abcdef12"],
};

const mockAgreementNoCap: SerializableAgreement = {
  agreementAddress: "0x1234567890123456789012345678901234567890",
  protocolName: "Small Protocol",
  bountyPercentage: 10,
  bountyCap: "500000000000", // $500K USDC
  allowAnonymous: false,
  coveredContracts: [],
};

export const WithAgreement = Template.bind({}) as unknown as { args: Args };
WithAgreement.args = {
  agreement: mockAgreement,
  hasAgreement: true,
  linkToTab: true,
};

export const WithAgreementNoAnonymous = Template.bind({}) as unknown as { args: Args };
WithAgreementNoAnonymous.args = {
  agreement: mockAgreementNoCap,
  hasAgreement: true,
  linkToTab: true,
};

export const WithAgreementNoLink = Template.bind({}) as unknown as { args: Args };
WithAgreementNoLink.args = {
  agreement: mockAgreement,
  hasAgreement: true,
  linkToTab: false,
};

export const NoAgreement = Template.bind({}) as unknown as { args: Args };
NoAgreement.args = {
  agreement: null,
  hasAgreement: false,
  linkToTab: true,
};

export const NoAgreementNoLink = Template.bind({}) as unknown as { args: Args };
NoAgreementNoLink.args = {
  agreement: null,
  hasAgreement: false,
  linkToTab: false,
};
