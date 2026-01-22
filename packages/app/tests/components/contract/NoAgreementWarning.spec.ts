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
  it("renders warning message", () => {
    const { container } = render(NoAgreementWarning, {
      global,
    });

    expect(container.textContent).toContain("does not have a registered Safe Harbor Agreement");
  });

  it("applies warning styling", () => {
    const { container } = render(NoAgreementWarning, {
      global,
    });

    expect(container.querySelector(".no-agreement-warning")).toBeTruthy();
  });

  it("renders warning icon", () => {
    const { container } = render(NoAgreementWarning, {
      global,
    });

    expect(container.querySelector(".warning-icon")).toBeTruthy();
  });
});
