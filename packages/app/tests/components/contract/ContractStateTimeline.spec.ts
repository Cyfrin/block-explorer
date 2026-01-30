import { createI18n } from "vue-i18n";

import { describe, expect, it } from "vitest";

import { render } from "@testing-library/vue";

import ContractStateTimeline from "@/components/contract/ContractStateTimeline.vue";

import enUS from "@/locales/en.json";

import { ContractState } from "@/types";
import { PROMOTION_DELAY_MS, PROMOTION_WINDOW_MS } from "@/utils/battlechain.constants";

const i18n = createI18n({
  locale: "en",
  allowComposition: true,
  messages: {
    en: enUS,
  },
});

const global = {
  plugins: [i18n],
  stubs: {
    CopyButton: {
      template: "<span><slot /></span>",
    },
    Tooltip: {
      template: "<span><slot /></span>",
    },
    TimeField: {
      template: "<span class='time-field'>time</span>",
      props: ["value", "format"],
    },
  },
};

describe("ContractStateTimeline", () => {
  describe("Registered (NEW_DEPLOYMENT) state", () => {
    it("renders registered state with countdown", () => {
      const registeredAt = Date.now() - 3600000; // 1 hour ago
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.NEW_DEPLOYMENT,
          wasUnderAttack: false,
          registeredAt,
          underAttackAt: null,
          productionAt: null,
          promotionWindowEnds: registeredAt + PROMOTION_WINDOW_MS,
        },
        global,
      });

      expect(container.textContent).toContain("Registered");
      expect(container.textContent).toContain("Production");
      // Attack steps should not be visible when never went through attack
      expect(container.textContent).not.toContain("Attackable");
    });

    it("handles null timestamps", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.NEW_DEPLOYMENT,
          wasUnderAttack: false,
          registeredAt: null,
          underAttackAt: null,
          productionAt: null,
        },
        global,
      });

      expect(container.textContent).toContain("Registered");
      expect(container.textContent).toContain("Production");
    });

    it("shows current step indicator for registered state", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.NEW_DEPLOYMENT,
          wasUnderAttack: false,
          registeredAt: Date.now(),
          underAttackAt: null,
          productionAt: null,
        },
        global,
      });

      const steps = container.querySelectorAll(".timeline-step");
      expect(steps[0].classList.contains("current")).toBe(true);
    });
  });

  describe("Warming Up (ATTACK_REQUESTED) state", () => {
    it("renders warming up state with appropriate steps", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.ATTACK_REQUESTED,
          wasUnderAttack: false,
          registeredAt: Date.now() - 86400000,
          underAttackAt: null,
          productionAt: null,
        },
        global,
      });

      expect(container.textContent).toContain("Registered");
      expect(container.textContent).toContain("Warming Up");
      expect(container.textContent).toContain("Production");

      const steps = container.querySelectorAll(".timeline-step");
      expect(steps.length).toBe(4); // Registered, Warming Up, Attackable (shown to indicate next phase), Production
    });

    it("shows dashed connector after warming up step", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.ATTACK_REQUESTED,
          wasUnderAttack: false,
          registeredAt: Date.now() - 86400000,
          underAttackAt: null,
          productionAt: null,
        },
        global,
      });

      const dashedConnectors = container.querySelectorAll(".timeline-connector.dashed");
      expect(dashedConnectors.length).toBeGreaterThan(0);
    });

    it("shows warming up step as current with warning styling", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.ATTACK_REQUESTED,
          wasUnderAttack: false,
          registeredAt: Date.now() - 86400000,
          underAttackAt: null,
          productionAt: null,
        },
        global,
      });

      const attackRequestedStep = container.querySelector(".timeline-step.attack-requested");
      expect(attackRequestedStep?.classList.contains("current")).toBe(true);
    });
  });

  describe("Attackable (UNDER_ATTACK) state", () => {
    it("renders attackable state", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.UNDER_ATTACK,
          wasUnderAttack: true,
          registeredAt: Date.now() - 86400000,
          underAttackAt: Date.now() - 3600000,
          productionAt: null,
        },
        global,
      });

      expect(container.textContent).toContain("Registered");
      expect(container.textContent).toContain("Attackable");
      expect(container.textContent).toContain("Production");
      // Warming Up step is ephemeral - should not appear once we've moved past it
      expect(container.textContent).not.toContain("Warming Up");
    });

    it("shows commitment lock when within commitment window", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.UNDER_ATTACK,
          wasUnderAttack: true,
          registeredAt: Date.now() - 86400000,
          underAttackAt: Date.now() - 3600000,
          productionAt: null,
          commitmentLockedUntil: Date.now() + 7 * 24 * 60 * 60 * 1000,
        },
        global,
      });

      expect(container.textContent).toContain("Terms unlock");
    });

    it("does not show commitment lock when expired", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.UNDER_ATTACK,
          wasUnderAttack: true,
          registeredAt: Date.now() - 86400000,
          underAttackAt: Date.now() - 3600000,
          productionAt: null,
          commitmentLockedUntil: Date.now() - 3600000, // expired
        },
        global,
      });

      expect(container.textContent).not.toContain("Terms unlock");
    });
  });

  describe("Promotion Pending (PROMOTION_REQUESTED) state", () => {
    it("renders promotion pending as part of attackable step with badge", () => {
      const promotionRequestedAt = Date.now() - 3600000;
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.PROMOTION_REQUESTED,
          wasUnderAttack: true,
          registeredAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          underAttackAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
          productionAt: null,
          promotionRequestedAt,
          promotionWindowEnds: promotionRequestedAt + PROMOTION_DELAY_MS,
        },
        global,
      });

      expect(container.textContent).toContain("Registered");
      expect(container.textContent).toContain("Attackable");
      expect(container.textContent).toContain("Promotion Pending"); // Badge on attackable step
      expect(container.textContent).toContain("Production");
    });

    it("shows attackable step as current with promotion-pending class", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.PROMOTION_REQUESTED,
          wasUnderAttack: true,
          registeredAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          underAttackAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
          productionAt: null,
          promotionRequestedAt: Date.now() - 3600000,
        },
        global,
      });

      // PROMOTION_REQUESTED shows as a variant of the attackable step
      const attackableStep = container.querySelector(".timeline-step.under-attack");
      expect(attackableStep?.classList.contains("current")).toBe(true);
      expect(attackableStep?.classList.contains("promotion-pending")).toBe(true);
    });

    it("shows commitment lock during promotion pending state", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.PROMOTION_REQUESTED,
          wasUnderAttack: true,
          registeredAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          underAttackAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
          productionAt: null,
          promotionRequestedAt: Date.now() - 3600000,
          commitmentLockedUntil: Date.now() + 7 * 24 * 60 * 60 * 1000,
        },
        global,
      });

      // Contract is still attackable during promotion pending, so commitment lock should show
      expect(container.textContent).toContain("Terms unlock");
    });
  });

  describe("Production state", () => {
    it("renders production state directly (no attack)", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.PRODUCTION,
          wasUnderAttack: false,
          registeredAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
          underAttackAt: null,
          productionAt: Date.now() - 86400000,
        },
        global,
      });

      expect(container.textContent).toContain("Registered");
      expect(container.textContent).toContain("Production");
      // Should not show Attackable step when contract went directly to production (wasUnderAttack=false)
      expect(container.textContent).not.toContain("Attackable");
      // Should not show Warming Up step either when skipped
      expect(container.textContent).not.toContain("Warming Up");
    });

    it("renders production state after attack", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.PRODUCTION,
          wasUnderAttack: true,
          registeredAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
          underAttackAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          productionAt: Date.now() - 86400000,
        },
        global,
      });

      expect(container.textContent).toContain("Registered");
      expect(container.textContent).toContain("Attackable");
      expect(container.textContent).toContain("Production");
      // Warming Up step is ephemeral - should not appear in historical view
      expect(container.textContent).not.toContain("Warming Up");
    });

    it("shows completed step indicator for production state", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.PRODUCTION,
          wasUnderAttack: false,
          registeredAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
          underAttackAt: null,
          productionAt: Date.now(),
        },
        global,
      });

      const steps = container.querySelectorAll(".timeline-step");
      expect(steps[0].classList.contains("completed")).toBe(true);
    });
  });

  describe("Compromised (CORRUPTED) state", () => {
    it("renders compromised state as terminal", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.CORRUPTED,
          wasUnderAttack: true,
          registeredAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          underAttackAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
          productionAt: null,
          corruptedAt: Date.now() - 86400000,
        },
        global,
      });

      expect(container.textContent).toContain("Registered");
      expect(container.textContent).toContain("Attackable");
      expect(container.textContent).toContain("Compromised");
      // Should NOT show Production when corrupted
      expect(container.textContent).not.toContain("Production");
    });

    it("shows attack details when available", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.CORRUPTED,
          wasUnderAttack: true,
          registeredAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          underAttackAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
          productionAt: null,
          corruptedAt: Date.now() - 86400000,
          attackDetails: {
            attackerAddress: "0x1234567890123456789012345678901234567890",
            attackType: "Reentrancy",
          },
        },
        global,
      });

      expect(container.textContent).toContain("Attacker");
      expect(container.textContent).toContain("Attack type");
      expect(container.textContent).toContain("Reentrancy");
    });

    it("does not show attack details when not available", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.CORRUPTED,
          wasUnderAttack: true,
          registeredAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          underAttackAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
          productionAt: null,
          corruptedAt: Date.now() - 86400000,
          attackDetails: null,
        },
        global,
      });

      expect(container.textContent).not.toContain("Attacker");
      expect(container.textContent).not.toContain("Attack type");
    });

    it("shows corrupted step with terminal styling", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.CORRUPTED,
          wasUnderAttack: true,
          registeredAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          underAttackAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
          productionAt: null,
          corruptedAt: Date.now() - 86400000,
        },
        global,
      });

      const corruptedStep = container.querySelector(".timeline-step.corrupted");
      expect(corruptedStep).not.toBeNull();
      expect(corruptedStep?.classList.contains("terminal")).toBe(true);
    });
  });

  describe("commitment lock", () => {
    it("does not show terms locked message when not in attackable state", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.NEW_DEPLOYMENT,
          wasUnderAttack: false,
          registeredAt: Date.now() - 3600000,
          underAttackAt: null,
          productionAt: null,
          commitmentLockedUntil: Date.now() + 7 * 24 * 60 * 60 * 1000,
        },
        global,
      });

      expect(container.textContent).not.toContain("Terms unlock");
    });

    it("does not show terms locked message when commitmentLockedUntil is null", () => {
      const { container } = render(ContractStateTimeline, {
        props: {
          state: ContractState.UNDER_ATTACK,
          wasUnderAttack: true,
          registeredAt: Date.now() - 86400000,
          underAttackAt: Date.now() - 3600000,
          productionAt: null,
          commitmentLockedUntil: null,
        },
        global,
      });

      expect(container.textContent).not.toContain("Terms unlock");
    });
  });
});
