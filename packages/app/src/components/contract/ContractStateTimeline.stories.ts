import ContractStateTimeline from "./ContractStateTimeline.vue";

import { ContractState } from "@/types";

export default {
  title: "Contract/ContractStateTimeline",
  component: ContractStateTimeline,
};

type Args = {
  state: ContractState;
  wasUnderAttack: boolean;
  registeredAt: number | null;
  underAttackAt: number | null;
  productionAt: number | null;
  commitmentLockedUntil: number | null;
};

const Template = (args: Args) => ({
  components: { ContractStateTimeline },
  setup() {
    return { args };
  },
  template: `<ContractStateTimeline v-bind="args" />`,
});

// Timestamps for demo (using relative times)
const now = Date.now();
const oneHourAgo = now - 60 * 60 * 1000;
const oneDayAgo = now - 24 * 60 * 60 * 1000;
const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

export const Registered = Template.bind({}) as unknown as { args: Args };
Registered.args = {
  state: ContractState.REGISTERED,
  wasUnderAttack: false,
  registeredAt: oneHourAgo,
  underAttackAt: null,
  productionAt: null,
  commitmentLockedUntil: null,
};

export const RegisteredThreeDaysAgo = Template.bind({}) as unknown as { args: Args };
RegisteredThreeDaysAgo.args = {
  state: ContractState.REGISTERED,
  wasUnderAttack: false,
  registeredAt: threeDaysAgo,
  underAttackAt: null,
  productionAt: null,
  commitmentLockedUntil: null,
};

export const AttackRequested = Template.bind({}) as unknown as { args: Args };
AttackRequested.args = {
  state: ContractState.ATTACK_REQUESTED,
  wasUnderAttack: false,
  registeredAt: oneDayAgo,
  underAttackAt: null,
  productionAt: null,
  commitmentLockedUntil: null,
};

export const UnderAttack = Template.bind({}) as unknown as { args: Args };
UnderAttack.args = {
  state: ContractState.UNDER_ATTACK,
  wasUnderAttack: true,
  registeredAt: oneDayAgo,
  underAttackAt: oneHourAgo,
  productionAt: null,
  commitmentLockedUntil: null,
};

export const UnderAttackWithTermsLocked = Template.bind({}) as unknown as { args: Args };
UnderAttackWithTermsLocked.args = {
  state: ContractState.UNDER_ATTACK,
  wasUnderAttack: true,
  registeredAt: oneDayAgo,
  underAttackAt: oneHourAgo,
  productionAt: null,
  commitmentLockedUntil: sevenDaysFromNow,
};

export const ProductionDirect = Template.bind({}) as unknown as { args: Args };
ProductionDirect.args = {
  state: ContractState.PRODUCTION,
  wasUnderAttack: false,
  registeredAt: oneWeekAgo,
  underAttackAt: null,
  productionAt: oneDayAgo,
  commitmentLockedUntil: null,
};

export const ProductionAfterAttack = Template.bind({}) as unknown as { args: Args };
ProductionAfterAttack.args = {
  state: ContractState.PRODUCTION,
  wasUnderAttack: true,
  registeredAt: oneWeekAgo,
  underAttackAt: threeDaysAgo,
  productionAt: oneDayAgo,
  commitmentLockedUntil: null,
};

export const RegisteredNoTimestamp = Template.bind({}) as unknown as { args: Args };
RegisteredNoTimestamp.args = {
  state: ContractState.REGISTERED,
  wasUnderAttack: false,
  registeredAt: null,
  underAttackAt: null,
  productionAt: null,
  commitmentLockedUntil: null,
};
