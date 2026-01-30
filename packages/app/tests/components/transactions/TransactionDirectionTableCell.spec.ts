import { describe, expect, it } from "vitest";

import { mount } from "@vue/test-utils";

import TransactionDirectionTableCell from "@/components/transactions/TransactionDirectionTableCell.vue";

import $testId from "@/plugins/testId";

describe("TransactionDirectionTableCell:", () => {
  it("renders 'in' state properly", () => {
    const wrapper = mount(TransactionDirectionTableCell, {
      props: {
        text: "in",
      },
      global: {
        plugins: [$testId],
      },
    });
    expect(wrapper.find(".badge-success").exists()).toBe(true);
    expect(wrapper.find(".badge-text").text()).toBe("in");
  });
  it("renders 'out' state properly", () => {
    const wrapper = mount(TransactionDirectionTableCell, {
      props: {
        text: "out",
      },
      global: {
        plugins: [$testId],
      },
    });
    expect(wrapper.find(".badge-warning").exists()).toBe(true);
    expect(wrapper.find(".badge-text").text()).toBe("out");
  });
  it("renders 'self' state properly", () => {
    const wrapper = mount(TransactionDirectionTableCell, {
      props: {
        text: "self",
      },
      global: {
        plugins: [$testId],
      },
    });
    expect(wrapper.find(".badge-accent").exists()).toBe(true);
    expect(wrapper.find(".badge-text").text()).toBe("self");
  });
});
