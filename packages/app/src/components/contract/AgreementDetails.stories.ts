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

// No wallet connected - shows "connect wallet to edit" prompt
export const NotConnected = Template.bind({}) as unknown as { args: Args };
NotConnected.args = {
  agreement: fullAgreement,
  owner: fullAgreement.owner,
  walletAddress: null,
};

// Owner view with locked terms - shows restriction banner
export const LockedOwnerView = Template.bind({}) as unknown as { args: Args };
LockedOwnerView.args = {
  agreement: fullAgreement, // fullAgreement has commitmentDeadline in the future
  owner: fullAgreement.owner,
  walletAddress: fullAgreement.owner,
};

// Owner view with unlocked terms (commitment deadline passed)
export const UnlockedOwnerView = Template.bind({}) as unknown as { args: Args };
UnlockedOwnerView.args = {
  agreement: minimalAgreement, // minimalAgreement has commitmentDeadline in the past
  owner: minimalAgreement.owner,
  walletAddress: minimalAgreement.owner,
};

// Agreement with very long strings to test truncation
const longStringAgreement: SafeHarborAgreement = {
  agreementAddress: "0x1234567890123456789012345678901234567890",
  owner: "0x1111111111111111111111111111111111111111",
  protocolName:
    "This Is An Extremely Long Protocol Name That Should Be Truncated In The UI Because It Exceeds The Maximum Display Width",
  bountyPercentage: 15,
  bountyCapUsd: "5000000",
  identityRequirement: "Named",
  retainable: true,
  diligenceRequirements:
    "This is a very long diligence requirements text that goes on and on and on. It includes many detailed requirements that must be met by the whitehat researcher before they can claim the bounty. The requirements include but are not limited to: providing valid government-issued identification, completing a background check, signing a non-disclosure agreement, and agreeing to the terms of service. Additionally, the researcher must demonstrate that they did not cause any harm to the protocol or its users during the course of their research.",
  coveredContracts: ["0xabcdef1234567890abcdef1234567890abcdef12", "0x1111111111111111111111111111111111111111"],
  contactDetails: [
    {
      name: "This Is A Very Long Contact Name That Should Be Truncated When Displayed",
      contact: "security-team-very-long-email-address-that-should-be-truncated@extremely-long-domain-name-example.com",
    },
    {
      name: "Support Contact With Long Name",
      contact: "https://example.com/very/long/path/to/support/page/that/goes/on/and/on/and/never/seems/to/end",
    },
  ],
  commitmentDeadline: inOneWeek,
  agreementURI:
    "ipfs://QmYwAPJzv5CZsnAzt8auVZRn1W2R5sHMN8LNxmhQHBvqJ4/very/long/path/to/document/that/exceeds/normal/display/width",
  registeredAt: oneMonthAgo,
  lastModified: oneWeekAgo,
};

export const LongStrings = Template.bind({}) as unknown as { args: Args };
LongStrings.args = {
  agreement: longStringAgreement,
};

// Long strings with owner view to test editing
export const LongStringsOwnerView = Template.bind({}) as unknown as { args: Args };
LongStringsOwnerView.args = {
  agreement: longStringAgreement,
  owner: longStringAgreement.owner,
  walletAddress: longStringAgreement.owner,
};

// --- Value at Risk stories ---

const highValueAgreement: SafeHarborAgreement = {
  ...fullAgreement,
  valueBand: "$1M - $10M",
  valuePricedUsd: "2847000",
  valuePricedTokens: [
    { symbol: "WETH", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", usd: 1200000 },
    { symbol: "USDC", address: "0xaaaa000000000000000000000000000000000001", usd: 890000 },
    { symbol: "WBTC", address: "0xaaaa000000000000000000000000000000000002", usd: 450000 },
    { symbol: "DAI", address: "0xaaaa000000000000000000000000000000000003", usd: 200000 },
    { symbol: "LINK", address: "0xaaaa000000000000000000000000000000000004", usd: 107000 },
  ],
  valueUnpricedTokens: [],
  valueConfidence: "HIGH",
  valueEstimatedAt: now - 2 * 60 * 60 * 1000, // 2 hours ago
};

export const ValueAtRiskHigh = Template.bind({}) as unknown as { args: Args };
ValueAtRiskHigh.args = {
  agreement: highValueAgreement,
};

const mediumConfidenceAgreement: SafeHarborAgreement = {
  ...fullAgreement,
  valueBand: "$100K - $1M",
  valuePricedUsd: "347000",
  valuePricedTokens: [
    { symbol: "USDC", address: "0xaaaa000000000000000000000000000000000001", usd: 200000 },
    { symbol: "WETH", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", usd: 120000 },
    { symbol: "UNI", address: "0xaaaa000000000000000000000000000000000005", usd: 27000 },
  ],
  valueUnpricedTokens: [
    { symbol: "VAULT-LP", address: "0xbbbb000000000000000000000000000000000001" },
    { symbol: null, address: "0xbbbb000000000000000000000000000000000002" },
  ],
  valueConfidence: "MEDIUM",
  valueEstimatedAt: now - 30 * 60 * 1000, // 30 minutes ago
};

export const ValueAtRiskMedium = Template.bind({}) as unknown as { args: Args };
ValueAtRiskMedium.args = {
  agreement: mediumConfidenceAgreement,
};

const lowConfidenceAgreement: SafeHarborAgreement = {
  ...fullAgreement,
  valueBand: "$10K - $100K",
  valuePricedUsd: "15200",
  valuePricedTokens: [{ symbol: "WETH", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", usd: 15200 }],
  valueUnpricedTokens: [
    { symbol: "xDAO", address: "0xcccc000000000000000000000000000000000001" },
    { symbol: "sLP-WETH", address: "0xcccc000000000000000000000000000000000002" },
    { symbol: null, address: "0xcccc000000000000000000000000000000000003" },
    { symbol: null, address: "0xcccc000000000000000000000000000000000004" },
    { symbol: "vTKN", address: "0xcccc000000000000000000000000000000000005" },
    { symbol: null, address: "0xcccc000000000000000000000000000000000006" },
    { symbol: "rBTC", address: "0xcccc000000000000000000000000000000000007" },
  ],
  valueConfidence: "LOW",
  valueEstimatedAt: now - 45 * 60 * 1000,
};

export const ValueAtRiskLow = Template.bind({}) as unknown as { args: Args };
ValueAtRiskLow.args = {
  agreement: lowConfidenceAgreement,
};

const veryHighValueAgreement: SafeHarborAgreement = {
  ...fullAgreement,
  valueBand: "$10M+",
  valuePricedUsd: "48200000",
  valuePricedTokens: [
    { symbol: "WETH", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", usd: 18000000 },
    { symbol: "USDC", address: "0xaaaa000000000000000000000000000000000001", usd: 12000000 },
    { symbol: "WBTC", address: "0xaaaa000000000000000000000000000000000002", usd: 8500000 },
    { symbol: "stETH", address: "0xaaaa000000000000000000000000000000000006", usd: 5200000 },
    { symbol: "DAI", address: "0xaaaa000000000000000000000000000000000003", usd: 2100000 },
    { symbol: "LINK", address: "0xaaaa000000000000000000000000000000000004", usd: 900000 },
    { symbol: "AAVE", address: "0xaaaa000000000000000000000000000000000007", usd: 650000 },
    { symbol: "CRV", address: "0xaaaa000000000000000000000000000000000008", usd: 420000 },
    { symbol: "MKR", address: "0xaaaa000000000000000000000000000000000009", usd: 230000 },
    { symbol: "SNX", address: "0xaaaa00000000000000000000000000000000000a", usd: 120000 },
    { symbol: "COMP", address: "0xaaaa00000000000000000000000000000000000b", usd: 55000 },
    { symbol: "BAL", address: "0xaaaa00000000000000000000000000000000000c", usd: 25000 },
  ],
  valueUnpricedTokens: [{ symbol: "govTKN", address: "0xdddd000000000000000000000000000000000001" }],
  valueConfidence: "MEDIUM",
  valueEstimatedAt: now - 10 * 60 * 1000,
};

export const ValueAtRiskVeryHigh = Template.bind({}) as unknown as { args: Args };
ValueAtRiskVeryHigh.args = {
  agreement: veryHighValueAgreement,
};

const smallValueAgreement: SafeHarborAgreement = {
  ...fullAgreement,
  valueBand: "< $10K",
  valuePricedUsd: "3200",
  valuePricedTokens: [
    { symbol: "USDC", address: "0xaaaa000000000000000000000000000000000001", usd: 2100 },
    { symbol: "WETH", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", usd: 1100 },
  ],
  valueUnpricedTokens: [],
  valueConfidence: "HIGH",
  valueEstimatedAt: now - 5 * 60 * 1000,
};

export const ValueAtRiskSmall = Template.bind({}) as unknown as { args: Args };
ValueAtRiskSmall.args = {
  agreement: smallValueAgreement,
};
