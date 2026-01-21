import { createI18n } from "vue-i18n";

import { describe, expect, it } from "vitest";

import { render } from "@testing-library/vue";

import NoAgreementWarning from "@/components/contract/NoAgreementWarning.vue";

import enUS from "@/locales/en.json";

const i18n = createI18n({
  locale: "en",
  allowComposition: true,
  messages: {
    en: enUS,
  },
});

const global = {
  plugins: [i18n],
};

describe("NoAgreementWarning", () => {
  it("renders warning title", () => {
    const { container } = render(NoAgreementWarning, {
      props: {
        defaultTerms: {
          bountyPercentage: 10,
          bountyCap: BigInt("5000000000000"),
        },
      },
      global,
    });

    expect(container.querySelector(".warning-title")).toBeTruthy();
  });

  it("renders default bounty percentage", () => {
    const { container } = render(NoAgreementWarning, {
      props: {
        defaultTerms: {
          bountyPercentage: 10,
          bountyCap: BigInt("5000000000000"),
        },
      },
      global,
    });

    expect(container.textContent).toContain("10%");
  });

  it("renders formatted default bounty cap", () => {
    const { container } = render(NoAgreementWarning, {
      props: {
        defaultTerms: {
          bountyPercentage: 10,
          bountyCap: BigInt("5000000000000"),
        },
      },
      global,
    });

    expect(container.textContent).toContain("$5M");
  });

  it("applies warning styling", () => {
    const { container } = render(NoAgreementWarning, {
      props: {
        defaultTerms: {
          bountyPercentage: 10,
          bountyCap: BigInt("5000000000000"),
        },
      },
      global,
    });

    expect(container.querySelector(".no-agreement-warning")).toBeTruthy();
  });

  it("renders warning icon", () => {
    const { container } = render(NoAgreementWarning, {
      props: {
        defaultTerms: {
          bountyPercentage: 10,
          bountyCap: BigInt("5000000000000"),
        },
      },
      global,
    });

    expect(container.querySelector(".warning-icon")).toBeTruthy();
  });

  it("uses default terms when not provided", () => {
    const { container } = render(NoAgreementWarning, {
      global,
    });

    // Default is 10% and $5M
    expect(container.textContent).toContain("10%");
    expect(container.textContent).toContain("$5M");
  });

  it("renders custom terms when provided", () => {
    const { container } = render(NoAgreementWarning, {
      props: {
        defaultTerms: {
          bountyPercentage: 5,
          bountyCap: BigInt("1000000000000"), // $1M
        },
      },
      global,
    });

    expect(container.textContent).toContain("5%");
    expect(container.textContent).toContain("$1M");
  });

  it("renders default terms section", () => {
    const { container } = render(NoAgreementWarning, {
      props: {
        defaultTerms: {
          bountyPercentage: 10,
          bountyCap: BigInt("5000000000000"),
        },
      },
      global,
    });

    expect(container.querySelector(".default-terms")).toBeTruthy();
  });
});
