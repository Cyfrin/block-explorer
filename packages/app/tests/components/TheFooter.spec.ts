import { createI18n } from "vue-i18n";

import { describe, expect, it } from "vitest";

import { mount } from "@vue/test-utils";

import TheFooter from "@/components/TheFooter.vue";

import enUS from "@/locales/en.json";

describe("TheFooter:", () => {
  const i18n = createI18n({
    locale: "en",
    allowComposition: true,
    messages: {
      en: enUS,
    },
  });

  it("renders footer container", () => {
    const wrapper = mount(TheFooter, {
      global: {
        plugins: [i18n],
      },
    });
    expect(wrapper.find(".footer-container").exists()).toBe(true);
  });

  it("renders version text", () => {
    const wrapper = mount(TheFooter, {
      global: {
        plugins: [i18n],
      },
    });
    expect(wrapper.find(".version-text-container").exists()).toBe(true);
  });
});
