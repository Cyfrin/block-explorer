import { createI18n } from "vue-i18n";

import { describe, expect, it } from "vitest";

import { render } from "@testing-library/vue";

import AgreementSummaryBadge from "@/components/contract/AgreementSummaryBadge.vue";

import enUS from "@/locales/en.json";

import type { SafeHarborAgreement } from "@/types";

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
    RouterLink: {
      template: "<a><slot /></a>",
      props: ["to"],
    },
  },
};

const mockAgreement: SafeHarborAgreement = {
  agreementAddress: "0x1234567890123456789012345678901234567890",
  protocolName: "Test Protocol",
  bountyPercentage: 15,
  bountyCapUsd: "5000000", // $5M
  identityRequirement: "Anonymous",
  coveredContracts: [],
};

describe("AgreementSummaryBadge", () => {
  it("renders agreement with protocol name", () => {
    const { container } = render(AgreementSummaryBadge, {
      props: {
        agreement: mockAgreement,
        hasAgreement: true,
        linkToTab: true,
      },
      global,
    });

    expect(container.textContent).toContain("Test Protocol");
  });

  it("renders bounty percentage", () => {
    const { container } = render(AgreementSummaryBadge, {
      props: {
        agreement: mockAgreement,
        hasAgreement: true,
        linkToTab: true,
      },
      global,
    });

    expect(container.textContent).toContain("15%");
  });

  it("renders formatted bounty cap", () => {
    const { container } = render(AgreementSummaryBadge, {
      props: {
        agreement: mockAgreement,
        hasAgreement: true,
        linkToTab: true,
      },
      global,
    });

    expect(container.textContent).toContain("$5,000,000");
  });

  it("shows anonymous allowed indicator when true", () => {
    const { container } = render(AgreementSummaryBadge, {
      props: {
        agreement: mockAgreement,
        hasAgreement: true,
        linkToTab: true,
      },
      global,
    });

    expect(container.textContent).toContain("Anonymous");
  });

  it("hides anonymous indicator when identityRequirement is Named", () => {
    const agreementNamed: SafeHarborAgreement = { ...mockAgreement, identityRequirement: "Named" };
    const { container } = render(AgreementSummaryBadge, {
      props: {
        agreement: agreementNamed,
        hasAgreement: true,
        linkToTab: true,
      },
      global,
    });

    expect(container.querySelector(".anonymous-allowed")).toBeFalsy();
  });

  it("renders no agreement warning", () => {
    const { container } = render(AgreementSummaryBadge, {
      props: {
        agreement: null,
        hasAgreement: false,
        linkToTab: true,
      },
      global,
    });

    expect(container.textContent).toContain("No Safe Harbor Agreement");
  });

  it("applies has-agreement class when agreement exists", () => {
    const { container } = render(AgreementSummaryBadge, {
      props: {
        agreement: mockAgreement,
        hasAgreement: true,
        linkToTab: true,
      },
      global,
    });

    expect(container.querySelector(".has-agreement")).toBeTruthy();
  });

  it("applies no-agreement class when no agreement", () => {
    const { container } = render(AgreementSummaryBadge, {
      props: {
        agreement: null,
        hasAgreement: false,
        linkToTab: true,
      },
      global,
    });

    expect(container.querySelector(".no-agreement")).toBeTruthy();
  });

  it("renders link when linkToTab is true", () => {
    const { container } = render(AgreementSummaryBadge, {
      props: {
        agreement: mockAgreement,
        hasAgreement: true,
        linkToTab: true,
      },
      global,
    });

    expect(container.querySelector(".view-details-link")).toBeTruthy();
  });

  it("hides link when linkToTab is false", () => {
    const { container } = render(AgreementSummaryBadge, {
      props: {
        agreement: mockAgreement,
        hasAgreement: true,
        linkToTab: false,
      },
      global,
    });

    expect(container.querySelector(".view-details-link")).toBeFalsy();
  });

  it("formats smaller bounty cap correctly", () => {
    const smallCapAgreement: SafeHarborAgreement = { ...mockAgreement, bountyCapUsd: "500000" }; // $500K
    const { container } = render(AgreementSummaryBadge, {
      props: {
        agreement: smallCapAgreement,
        hasAgreement: true,
        linkToTab: true,
      },
      global,
    });

    expect(container.textContent).toContain("$500,000");
  });
});
