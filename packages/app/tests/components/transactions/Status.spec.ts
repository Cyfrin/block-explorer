import { createI18n } from "vue-i18n";

import { describe, expect, it } from "vitest";

import { mount } from "@vue/test-utils";

import Badge from "@/components/common/Badge.vue";
import Status from "@/components/transactions/Status.vue";

import enUS from "@/locales/en.json";

import $testId from "@/plugins/testId";

describe("Status", () => {
  const i18n = createI18n({
    locale: "en",
    allowComposition: true,
    messages: {
      en: enUS,
    },
  });
  const global = {
    stubs: {
      Badge,
    },
    plugins: [i18n, $testId],
  };
  it("shows a single error badge for 'failed' status", async () => {
    const wrapper = mount(Status, {
      global,
      props: {
        status: "failed",
      },
    });
    const badges = wrapper.findAllComponents(Badge);
    expect(badges.length).toBe(1);

    const [failedBadge] = badges;

    expect(failedBadge.props().color).toBe("error");
    expect(failedBadge.text()).toBe(i18n.global.t("transactions.statusComponent.failed"));
  });
  it("shows execution and finality badges for 'included' status", async () => {
    const wrapper = mount(Status, {
      global,
      props: {
        status: "included",
      },
    });

    // Labels are now <span> elements, not Badge components
    const labels = wrapper.findAll(".status-label");
    expect(labels[0].text()).toBe(i18n.global.t("general.execution"));
    expect(labels[1].text()).toBe(i18n.global.t("general.finality"));

    // Badge components: Processed badge + finality desktop badge + finality mobile badge
    const badges = wrapper.findAllComponents(Badge);
    expect(badges.length).toBe(3);

    const [l2StatusBadgeValue, l1StatusBadgeValueDesktop] = badges;

    expect(l2StatusBadgeValue.text()).toBe(i18n.global.t("transactions.statusComponent.processed"));
    expect(l2StatusBadgeValue.props().color).toBe("success");

    expect(l1StatusBadgeValueDesktop.props().color).toBe("neutral");
  });
  it("shows execution and finality badges for 'committed' status", async () => {
    const wrapper = mount(Status, {
      global,
      props: {
        status: "committed",
      },
    });

    const labels = wrapper.findAll(".status-label");
    expect(labels[0].text()).toBe(i18n.global.t("general.execution"));
    expect(labels[1].text()).toBe(i18n.global.t("general.finality"));

    const badges = wrapper.findAllComponents(Badge);
    expect(badges.length).toBe(3);

    const [l2StatusBadgeValue, l1StatusBadgeValueDesktop] = badges;

    expect(l2StatusBadgeValue.text()).toBe(i18n.global.t("transactions.statusComponent.processed"));
    expect(l2StatusBadgeValue.props().color).toBe("success");

    expect(l1StatusBadgeValueDesktop.props().color).toBe("neutral");
  });
  it("shows execution and finality badges for 'proved' status", async () => {
    const wrapper = mount(Status, {
      global,
      props: {
        status: "proved",
      },
    });

    const labels = wrapper.findAll(".status-label");
    expect(labels[0].text()).toBe(i18n.global.t("general.execution"));
    expect(labels[1].text()).toBe(i18n.global.t("general.finality"));

    const badges = wrapper.findAllComponents(Badge);
    expect(badges.length).toBe(3);

    const [l2StatusBadgeValue, l1StatusBadgeValueDesktop] = badges;

    expect(l2StatusBadgeValue.text()).toBe(i18n.global.t("transactions.statusComponent.processed"));
    expect(l2StatusBadgeValue.props().color).toBe("success");

    expect(l1StatusBadgeValueDesktop.props().color).toBe("neutral");
  });
  it("shows execution and finality success badges for 'verified' status", async () => {
    const wrapper = mount(Status, {
      global,
      props: {
        status: "verified",
      },
    });

    const labels = wrapper.findAll(".status-label");
    expect(labels[0].text()).toBe(i18n.global.t("general.execution"));
    expect(labels[1].text()).toBe(i18n.global.t("general.finality"));

    const badges = wrapper.findAllComponents(Badge);
    expect(badges.length).toBe(3);

    const [l2StatusBadgeValue, l1StatusBadgeValueDesktop] = badges;

    expect(l2StatusBadgeValue.text()).toBe(i18n.global.t("transactions.statusComponent.processed"));
    expect(l2StatusBadgeValue.props().color).toBe("success");

    expect(l1StatusBadgeValueDesktop.props().color).toBe("success");
  });
  it("shows indexing badge for 'indexing' status", async () => {
    const wrapper = mount(Status, {
      global,
      props: {
        status: "indexing",
      },
    });

    // Execution label
    const labels = wrapper.findAll(".status-label");
    expect(labels[0].text()).toBe(i18n.global.t("general.execution"));

    // Badge components: Processed badge + Indexing badge
    const badges = wrapper.findAllComponents(Badge);
    expect(badges.length).toBe(2);

    const [l2StatusBadgeValue, indexingBadge] = badges;

    expect(l2StatusBadgeValue.text()).toBe(i18n.global.t("transactions.statusComponent.processed"));
    expect(l2StatusBadgeValue.props().color).toBe("success");

    expect(indexingBadge.props().color).toBe("neutral");
    expect(indexingBadge.text()).toBe(i18n.global.t("transactions.statusComponent.indexing"));
  });
});
