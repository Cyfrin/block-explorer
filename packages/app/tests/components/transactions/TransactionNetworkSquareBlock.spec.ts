import { describe, expect, it } from "vitest";

import { mount } from "@vue/test-utils";

import TransactionSquare from "@/components/transactions/TransactionNetworkSquareBlock.vue";

import $testId from "@/plugins/testId";

describe("TransactionNetworkSquareBlock:", () => {
  it("renders component", () => {
    const wrapper = mount(TransactionSquare, {
      props: {
        network: "L1",
      },
      global: {
        plugins: [$testId],
      },
    });
    expect(wrapper.find(".badge-text").text()).toBe("L1");
  });
});
