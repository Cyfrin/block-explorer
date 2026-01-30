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
  contractState: string | null;
};

const Template = (args: Args) => ({
  components: { AgreementSummaryBadge },
  setup() {
    return {
      agreement: args.agreement,
      hasAgreement: args.hasAgreement,
      linkToTab: args.linkToTab,
      contractState: args.contractState,
    };
  },
  template: `<AgreementSummaryBadge :agreement="agreement" :hasAgreement="hasAgreement" :linkToTab="linkToTab" :contractState="contractState" />`,
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
  contractState: "UNDER_ATTACK",
};

export const WithAgreementNoAnonymous = Template.bind({}) as unknown as { args: Args };
WithAgreementNoAnonymous.args = {
  agreement: mockAgreementNoCap,
  hasAgreement: true,
  linkToTab: true,
  contractState: "UNDER_ATTACK",
};

export const WithAgreementNoLink = Template.bind({}) as unknown as { args: Args };
WithAgreementNoLink.args = {
  agreement: mockAgreement,
  hasAgreement: true,
  linkToTab: false,
  contractState: "UNDER_ATTACK",
};

export const NoAgreement = Template.bind({}) as unknown as { args: Args };
NoAgreement.args = {
  agreement: null,
  hasAgreement: false,
  linkToTab: true,
  contractState: null,
};

export const NoAgreementNoLink = Template.bind({}) as unknown as { args: Args };
NoAgreementNoLink.args = {
  agreement: null,
  hasAgreement: false,
  linkToTab: false,
  contractState: null,
};

// State-specific stories
export const StatePendingApproval = Template.bind({}) as unknown as { args: Args };
StatePendingApproval.args = {
  agreement: mockAgreement,
  hasAgreement: true,
  linkToTab: true,
  contractState: "ATTACK_REQUESTED",
};

export const StateActive = Template.bind({}) as unknown as { args: Args };
StateActive.args = {
  agreement: mockAgreement,
  hasAgreement: true,
  linkToTab: true,
  contractState: "UNDER_ATTACK",
};

export const StatePromotionPending = Template.bind({}) as unknown as { args: Args };
StatePromotionPending.args = {
  agreement: mockAgreement,
  hasAgreement: true,
  linkToTab: true,
  contractState: "PROMOTION_REQUESTED",
};

export const StateProduction = Template.bind({}) as unknown as { args: Args };
StateProduction.args = {
  agreement: mockAgreement,
  hasAgreement: true,
  linkToTab: true,
  contractState: "PRODUCTION",
};

export const StateCorrupted = Template.bind({}) as unknown as { args: Args };
StateCorrupted.args = {
  agreement: mockAgreement,
  hasAgreement: true,
  linkToTab: true,
  contractState: "CORRUPTED",
};
