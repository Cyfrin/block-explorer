import { vueRouter } from "storybook-vue3-router";

import AgreementsTable from "./Table.vue";

import type { AgreementListItem, SortDirection, SortKey } from "@/composables/useAgreements";

import { ContractState } from "@/types";

export default {
  title: "Agreements/Table",
  component: AgreementsTable,
};

type Args = {
  agreements: AgreementListItem[];
  loading: boolean;
  total?: number;
  pageSize?: number;
  sortKey?: SortKey | null;
  sortDirection?: SortDirection;
};

const Template = (args: Args) => ({
  components: { AgreementsTable },
  setup() {
    return { ...args };
  },
  template: `
    <AgreementsTable
      :agreements="agreements"
      :loading="loading"
      :total="total"
      :page-size="pageSize"
      :sort-key="sortKey"
      :sort-direction="sortDirection"
    />
  `,
});

const routes = vueRouter([
  { path: "/", name: "home", component: {} },
  { path: "/address/:address", name: "address", component: {} },
  { path: "/agreements", name: "agreements", component: {} },
]);

const now = Date.now();
const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
const twoMonthsAgo = now - 60 * 24 * 60 * 60 * 1000;

const agreements: AgreementListItem[] = [
  {
    agreementAddress: "0x1111111111111111111111111111111111111111",
    owner: "0xaaaa000000000000000000000000000000000001",
    state: ContractState.UNDER_ATTACK,
    protocolName: "Uniswap V3",
    bountyPercentage: 10,
    bountyCapUsd: "5000000",
    createdAtBlock: 100,
    createdAt: oneMonthAgo,
    valueBand: "$1M - $10M",
    valuePricedUsd: "2847000",
    valuePricedTokens: [
      { symbol: "WETH", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", usd: 1200000 },
      { symbol: "USDC", address: "0xaaaa000000000000000000000000000000000011", usd: 890000 },
      { symbol: "WBTC", address: "0xaaaa000000000000000000000000000000000012", usd: 450000 },
      { symbol: "DAI", address: "0xaaaa000000000000000000000000000000000013", usd: 200000 },
      { symbol: "LINK", address: "0xaaaa000000000000000000000000000000000014", usd: 107000 },
    ],
    valueUnpricedTokens: [],
    valueConfidence: "HIGH",
    valueEstimatedAt: now - 2 * 60 * 60 * 1000,
  },
  {
    agreementAddress: "0x2222222222222222222222222222222222222222",
    owner: "0xaaaa000000000000000000000000000000000002",
    state: ContractState.UNDER_ATTACK,
    protocolName: "Aave Lens",
    bountyPercentage: 5,
    bountyCapUsd: "10000000",
    createdAtBlock: 200,
    createdAt: twoMonthsAgo,
    valueBand: "$10M+",
    valuePricedUsd: "48200000",
    valuePricedTokens: [
      { symbol: "WETH", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", usd: 18000000 },
      { symbol: "USDC", address: "0xaaaa000000000000000000000000000000000011", usd: 12000000 },
      { symbol: "WBTC", address: "0xaaaa000000000000000000000000000000000012", usd: 8500000 },
    ],
    valueUnpricedTokens: [
      { symbol: "govTKN", address: "0xdddd000000000000000000000000000000000001" },
      { symbol: null, address: "0xdddd000000000000000000000000000000000002" },
    ],
    valueConfidence: "MEDIUM",
    valueEstimatedAt: now - 30 * 60 * 1000,
  },
  {
    agreementAddress: "0x3333333333333333333333333333333333333333",
    owner: "0xaaaa000000000000000000000000000000000003",
    state: ContractState.UNDER_ATTACK,
    protocolName: "MyToken Vault",
    bountyPercentage: 15,
    bountyCapUsd: "500000",
    createdAtBlock: 300,
    createdAt: twoWeeksAgo,
    valueBand: "$10K - $100K",
    valuePricedUsd: "72000",
    valuePricedTokens: [
      { symbol: "WETH", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", usd: 50000 },
      { symbol: "USDC", address: "0xaaaa000000000000000000000000000000000011", usd: 15000 },
      { symbol: "DAI", address: "0xaaaa000000000000000000000000000000000013", usd: 7000 },
    ],
    valueUnpricedTokens: [],
    valueConfidence: "HIGH",
    valueEstimatedAt: now - 45 * 60 * 1000,
  },
  {
    agreementAddress: "0x4444444444444444444444444444444444444444",
    owner: "0xaaaa000000000000000000000000000000000004",
    state: ContractState.UNDER_ATTACK,
    protocolName: "SmallDAO",
    bountyPercentage: 20,
    bountyCapUsd: "0",
    createdAtBlock: 400,
    createdAt: oneWeekAgo,
    valueBand: "< $10K",
    valuePricedUsd: "3200",
    valuePricedTokens: [
      { symbol: "USDC", address: "0xaaaa000000000000000000000000000000000011", usd: 2100 },
      { symbol: "WETH", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", usd: 1100 },
    ],
    valueUnpricedTokens: [
      { symbol: "xDAO", address: "0xcccc000000000000000000000000000000000001" },
      { symbol: "sLP-WETH", address: "0xcccc000000000000000000000000000000000002" },
      { symbol: null, address: "0xcccc000000000000000000000000000000000003" },
      { symbol: null, address: "0xcccc000000000000000000000000000000000004" },
      { symbol: "vTKN", address: "0xcccc000000000000000000000000000000000005" },
    ],
    valueConfidence: "LOW",
    valueEstimatedAt: now - 10 * 60 * 1000,
  },
  {
    agreementAddress: "0x5555555555555555555555555555555555555555",
    owner: "0xaaaa000000000000000000000000000000000005",
    state: ContractState.NEW_DEPLOYMENT,
    protocolName: "New Protocol",
    bountyPercentage: 10,
    bountyCapUsd: "1000000",
    createdAtBlock: 500,
    createdAt: now - 2 * 24 * 60 * 60 * 1000,
    // No value estimation yet (not UNDER_ATTACK)
  },
  {
    agreementAddress: "0x6666666666666666666666666666666666666666",
    owner: "0xaaaa000000000000000000000000000000000006",
    state: ContractState.PRODUCTION,
    protocolName: "Stable Protocol",
    bountyPercentage: 8,
    bountyCapUsd: "2000000",
    createdAtBlock: 50,
    createdAt: twoMonthsAgo,
    valueBand: "$100K - $1M",
    valuePricedUsd: "890000",
    valuePricedTokens: [
      { symbol: "USDC", address: "0xaaaa000000000000000000000000000000000011", usd: 400000 },
      { symbol: "WETH", address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", usd: 320000 },
      { symbol: "DAI", address: "0xaaaa000000000000000000000000000000000013", usd: 170000 },
    ],
    valueUnpricedTokens: [{ symbol: "sFRAX", address: "0xdddd000000000000000000000000000000000003" }],
    valueConfidence: "MEDIUM",
    valueEstimatedAt: now - 60 * 60 * 1000,
  },
];

export const Default = Template.bind({}) as unknown as { args: Args; decorators: unknown[] };
Default.args = {
  agreements,
  loading: false,
  total: agreements.length,
  pageSize: 10,
};
Default.decorators = [routes];

export const Loading = Template.bind({}) as unknown as { args: Args; decorators: unknown[] };
Loading.args = {
  agreements: [],
  loading: true,
  total: 0,
  pageSize: 10,
};
Loading.decorators = [routes];

export const Empty = Template.bind({}) as unknown as { args: Args; decorators: unknown[] };
Empty.args = {
  agreements: [],
  loading: false,
  total: 0,
  pageSize: 10,
};
Empty.decorators = [routes];

export const SortedByValue = Template.bind({}) as unknown as { args: Args; decorators: unknown[] };
SortedByValue.args = {
  agreements,
  loading: false,
  total: agreements.length,
  pageSize: 10,
  sortKey: "valuePricedUsd",
  sortDirection: "desc",
};
SortedByValue.decorators = [routes];

// Agreements without any value estimation data (before first estimation run)
const noValueAgreements: AgreementListItem[] = agreements.map((agreement) => {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    valueBand,
    valuePricedUsd,
    valuePricedTokens,
    valueUnpricedTokens,
    valueConfidence,
    valueEstimatedAt,
    ...rest
  } = agreement;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return rest;
});

export const NoValueEstimation = Template.bind({}) as unknown as { args: Args; decorators: unknown[] };
NoValueEstimation.args = {
  agreements: noValueAgreements,
  loading: false,
  total: noValueAgreements.length,
  pageSize: 10,
};
NoValueEstimation.decorators = [routes];
