import { createI18n } from "vue-i18n";

import { describe, expect, it } from "vitest";

import { render } from "@testing-library/vue";

import ContractStateTimeline from "@/components/contract/ContractStateTimeline.vue";

import enUS from "@/locales/en.json";

import { ContractState } from "@/types";

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
  it("renders registered state", () => {
    const { container } = render(ContractStateTimeline, {
      props: {
        state: ContractState.REGISTERED,
        wasUnderAttack: false,
        registeredAt: Date.now() - 3600000,
        underAttackAt: null,
        productionAt: null,
      },
      global,
    });

    expect(container.textContent).toContain("Registered");
    expect(container.textContent).toContain("Production");
    // Under attack step should not be visible when wasUnderAttack is false
    expect(container.textContent).not.toContain("Under Attack");
  });

  it("renders under attack state", () => {
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
    expect(container.textContent).toContain("Under Attack");
    expect(container.textContent).toContain("Production");
  });

  it("renders production state directly (no attack)", () => {
    const { container } = render(ContractStateTimeline, {
      props: {
        state: ContractState.PRODUCTION,
        wasUnderAttack: false,
        registeredAt: Date.now() - 604800000,
        underAttackAt: null,
        productionAt: Date.now() - 86400000,
      },
      global,
    });

    expect(container.textContent).toContain("Registered");
    expect(container.textContent).toContain("Production");
    // Under attack step should not be visible
    expect(container.textContent).not.toContain("Under Attack");
  });

  it("renders production state after attack", () => {
    const { container } = render(ContractStateTimeline, {
      props: {
        state: ContractState.PRODUCTION,
        wasUnderAttack: true,
        registeredAt: Date.now() - 604800000,
        underAttackAt: Date.now() - 259200000,
        productionAt: Date.now() - 86400000,
      },
      global,
    });

    expect(container.textContent).toContain("Registered");
    expect(container.textContent).toContain("Under Attack");
    expect(container.textContent).toContain("Production");
  });

  it("shows current step indicator for registered state", () => {
    const { container } = render(ContractStateTimeline, {
      props: {
        state: ContractState.REGISTERED,
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

  it("shows completed step indicator for production state", () => {
    const { container } = render(ContractStateTimeline, {
      props: {
        state: ContractState.PRODUCTION,
        wasUnderAttack: false,
        registeredAt: Date.now() - 604800000,
        underAttackAt: null,
        productionAt: Date.now(),
      },
      global,
    });

    const steps = container.querySelectorAll(".timeline-step");
    expect(steps[0].classList.contains("completed")).toBe(true);
  });

  it("handles null timestamps", () => {
    const { container } = render(ContractStateTimeline, {
      props: {
        state: ContractState.REGISTERED,
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
});
