import { createI18n } from "vue-i18n";

import { describe, expect, it } from "vitest";

import { fireEvent, render } from "@testing-library/vue";
import { mount, RouterLinkStub } from "@vue/test-utils";

import { linkTo } from "../../utils/routerLink";

import CopyButton from "@/components/common/CopyButton.vue";
import EventTopics from "@/components/event/EventTopics.vue";

import enUS from "@/locales/en.json";

import type { TransactionEvent } from "@/composables/useEventLog";

const topics = [
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  "0x0000000000000000000000006cc8cf7f6b488c58aa909b77e6e65c631c204784",
  "0x000000000000000000000000a1cf087db965ab02fb3cface1f5c63935815f044",
];

const event = {
  name: "Transfer",
  inputs: [
    {
      name: "from",
      type: "address",
      value: "0x6cC8cf7f6b488C58AA909B77E6e65c631c204784",
    },
    {
      name: "to",
      type: "address",
      value: "0xa1cf087DB965Ab02Fb3CFaCe1f5c63935815f044",
    },
    {
      name: "value",
      type: "uint256",
      value: "1",
    },
  ],
};

describe("EventTopics", () => {
  const i18n = createI18n({
    locale: "en",
    allowComposition: true,
    messages: {
      en: enUS,
    },
  });
  const global = {
    stubs: {
      RouterLink: RouterLinkStub,
    },
    plugins: [i18n],
  };

  it("renders component properly", () => {
    const { getByText, unmount } = render(EventTopics, {
      props: {
        topics,
      },
      global,
    });
    getByText("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");
    getByText("0x0000000000000000000000006cc8cf7f6b488c58aa909b77e6e65c631c204784");
    getByText("0x000000000000000000000000a1cf087db965ab02fb3cface1f5c63935815f044");
    unmount();
  });

  it("renders address links when event the input type is address", () => {
    const wrapper = mount(EventTopics, {
      props: {
        topics,
        event: event as TransactionEvent,
      },
      global,
    });

    const routerLinks = wrapper.findAllComponents(RouterLinkStub);
    expect(routerLinks).toHaveLength(2);
    expect(linkTo(routerLinks[0]!).name).toBe("address");
    expect(linkTo(routerLinks[0]!).params!.address).toBe("0x6cC8cf7f6b488C58AA909B77E6e65c631c204784");
    expect(linkTo(routerLinks[1]!).name).toBe("address");
    expect(linkTo(routerLinks[1]!).params!.address).toBe("0xa1cf087DB965Ab02Fb3CFaCe1f5c63935815f044");

    wrapper.unmount();
  });
  it("opens dropdown up if the popoverPlacement is seted to 'top'", async () => {
    const { container, unmount } = render(EventTopics, {
      props: {
        topics,
        popoverPlacement: "top",
      },
      global,
    });

    await fireEvent.click(container.querySelector(".toggle-button")!);
    expect(container.querySelector(".opens-up")).toBeTruthy();

    unmount();
  });
  it("renders copy buttons when showCopyButton is true", () => {
    const wrapper = mount(EventTopics, {
      props: {
        topics,
        showCopyButton: true,
      },
      global,
    });

    expect(wrapper.findAllComponents(CopyButton)).toHaveLength(3);

    wrapper.unmount();
  });
});
