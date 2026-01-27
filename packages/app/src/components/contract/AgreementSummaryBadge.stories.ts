import AgreementSummaryBadge from "./AgreementSummaryBadge.vue";

import type { SafeHarborAgreement } from "@/types";

export default {
  title: "Contract/AgreementSummaryBadge",
  component: AgreementSummaryBadge,
};

type Args = {
  agreement: SafeHarborAgreement | null;
  hasAgreement: boolean;
  linkToTab: boolean;
};

const Template = (args: Args) => ({
  components: { AgreementSummaryBadge },
  setup() {
    return { agreement: args.agreement, hasAgreement: args.hasAgreement, linkToTab: args.linkToTab };
  },
  template: `<AgreementSummaryBadge :agreement="agreement" :hasAgreement="hasAgreement" :linkToTab="linkToTab" />`,
});

const mockAgreement: SafeHarborAgreement = {
  agreementAddress: "0x1234567890123456789012345678901234567890",
  protocolName: "Example Protocol",
  bountyPercentage: 15,
  bountyCapUsd: "5000000", // $5M
  identityRequirement: "Anonymous",
  coveredContracts: ["0xabcdef1234567890abcdef1234567890abcdef12"],
};

const mockAgreementNoCap: SafeHarborAgreement = {
  agreementAddress: "0x1234567890123456789012345678901234567890",
  protocolName: "Small Protocol",
  bountyPercentage: 10,
  bountyCapUsd: "500000", // $500K
  identityRequirement: "Named",
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
