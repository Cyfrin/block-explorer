import ContractStateTimeline from "./ContractStateTimeline.vue";

import { ContractState } from "@/types";
import { PROMOTION_DELAY_MS, PROMOTION_WINDOW_MS } from "@/utils/battlechain.constants";

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
  promotionRequestedAt: number | null;
  corruptedAt: number | null;
  promotionWindowEnds: number | null;
  commitmentLockedUntil: number | null;
  attackDetails: {
    attackerAddress?: string;
    attackRegisteredAt?: number;
    attackType?: string;
  } | null;
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
const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

// Registered - Just registered, 14 days until auto-promotion
export const Registered = Template.bind({}) as unknown as { args: Args };
Registered.args = {
  state: ContractState.NEW_DEPLOYMENT,
  wasUnderAttack: false,
  registeredAt: oneHourAgo,
  underAttackAt: null,
  productionAt: null,
  promotionRequestedAt: null,
  corruptedAt: null,
  promotionWindowEnds: oneHourAgo + PROMOTION_WINDOW_MS,
  commitmentLockedUntil: null,
  attackDetails: null,
};

// Registered three days ago - Shows countdown
export const RegisteredThreeDaysAgo = Template.bind({}) as unknown as { args: Args };
RegisteredThreeDaysAgo.args = {
  state: ContractState.NEW_DEPLOYMENT,
  wasUnderAttack: false,
  registeredAt: threeDaysAgo,
  underAttackAt: null,
  productionAt: null,
  promotionRequestedAt: null,
  corruptedAt: null,
  promotionWindowEnds: threeDaysAgo + PROMOTION_WINDOW_MS,
  commitmentLockedUntil: null,
  attackDetails: null,
};

// Warming Up (Attack Requested) - Waiting for DAO approval
export const WarmingUp = Template.bind({}) as unknown as { args: Args };
WarmingUp.args = {
  state: ContractState.ATTACK_REQUESTED,
  wasUnderAttack: false,
  registeredAt: oneDayAgo,
  underAttackAt: null,
  productionAt: null,
  promotionRequestedAt: null,
  corruptedAt: null,
  promotionWindowEnds: oneDayAgo + PROMOTION_WINDOW_MS,
  commitmentLockedUntil: null,
  attackDetails: null,
};

// Attackable (Under Attack) - Open for ethical hacking
export const Attackable = Template.bind({}) as unknown as { args: Args };
Attackable.args = {
  state: ContractState.UNDER_ATTACK,
  wasUnderAttack: true,
  registeredAt: threeDaysAgo,
  underAttackAt: oneHourAgo,
  productionAt: null,
  promotionRequestedAt: null,
  corruptedAt: null,
  promotionWindowEnds: threeDaysAgo + PROMOTION_WINDOW_MS,
  commitmentLockedUntil: null,
  attackDetails: null,
};

// Attackable with commitment lock
export const AttackableWithTermsLocked = Template.bind({}) as unknown as { args: Args };
AttackableWithTermsLocked.args = {
  state: ContractState.UNDER_ATTACK,
  wasUnderAttack: true,
  registeredAt: threeDaysAgo,
  underAttackAt: oneHourAgo,
  productionAt: null,
  promotionRequestedAt: null,
  corruptedAt: null,
  promotionWindowEnds: threeDaysAgo + PROMOTION_WINDOW_MS,
  commitmentLockedUntil: now + 7 * 24 * 60 * 60 * 1000,
  attackDetails: null,
};

// Promotion Pending - 3-day delay before production
export const PromotionPending = Template.bind({}) as unknown as { args: Args };
PromotionPending.args = {
  state: ContractState.PROMOTION_REQUESTED,
  wasUnderAttack: true,
  registeredAt: oneWeekAgo,
  underAttackAt: threeDaysAgo,
  productionAt: null,
  promotionRequestedAt: oneHourAgo,
  corruptedAt: null,
  promotionWindowEnds: oneHourAgo + PROMOTION_DELAY_MS,
  commitmentLockedUntil: null,
  attackDetails: null,
};

// Production - Direct path (skipped attack phase)
export const ProductionDirect = Template.bind({}) as unknown as { args: Args };
ProductionDirect.args = {
  state: ContractState.PRODUCTION,
  wasUnderAttack: false,
  registeredAt: twoWeeksAgo,
  underAttackAt: null,
  productionAt: oneDayAgo,
  promotionRequestedAt: null,
  corruptedAt: null,
  promotionWindowEnds: null,
  commitmentLockedUntil: null,
  attackDetails: null,
};

// Production - After attack phase
export const ProductionAfterAttack = Template.bind({}) as unknown as { args: Args };
ProductionAfterAttack.args = {
  state: ContractState.PRODUCTION,
  wasUnderAttack: true,
  registeredAt: twoWeeksAgo,
  underAttackAt: oneWeekAgo,
  productionAt: oneDayAgo,
  promotionRequestedAt: threeDaysAgo,
  corruptedAt: null,
  promotionWindowEnds: null,
  commitmentLockedUntil: null,
  attackDetails: null,
};

// Compromised - Contract was successfully attacked
export const Compromised = Template.bind({}) as unknown as { args: Args };
Compromised.args = {
  state: ContractState.CORRUPTED,
  wasUnderAttack: true,
  registeredAt: oneWeekAgo,
  underAttackAt: threeDaysAgo,
  productionAt: null,
  promotionRequestedAt: null,
  corruptedAt: oneDayAgo,
  promotionWindowEnds: null,
  commitmentLockedUntil: null,
  attackDetails: {
    attackerAddress: "0x1234567890123456789012345678901234567890",
    attackRegisteredAt: oneDayAgo,
    attackType: "Reentrancy",
  },
};

// Compromised - Without attack details
export const CompromisedNoDetails = Template.bind({}) as unknown as { args: Args };
CompromisedNoDetails.args = {
  state: ContractState.CORRUPTED,
  wasUnderAttack: true,
  registeredAt: oneWeekAgo,
  underAttackAt: threeDaysAgo,
  productionAt: null,
  promotionRequestedAt: null,
  corruptedAt: oneDayAgo,
  promotionWindowEnds: null,
  commitmentLockedUntil: null,
  attackDetails: null,
};

// Edge case: No timestamp
export const RegisteredNoTimestamp = Template.bind({}) as unknown as { args: Args };
RegisteredNoTimestamp.args = {
  state: ContractState.NEW_DEPLOYMENT,
  wasUnderAttack: false,
  registeredAt: null,
  underAttackAt: null,
  productionAt: null,
  promotionRequestedAt: null,
  corruptedAt: null,
  promotionWindowEnds: null,
  commitmentLockedUntil: null,
  attackDetails: null,
};
