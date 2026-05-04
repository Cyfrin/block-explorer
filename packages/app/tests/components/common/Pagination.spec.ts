import { createI18n } from "vue-i18n";

import { describe, expect, it, vi } from "vitest";

import { fireEvent } from "@testing-library/vue";
import { mount, RouterLinkStub } from "@vue/test-utils";

import { linkTo } from "../../utils/routerLink";

import Pagination from "@/components/common/Pagination.vue";

import enUS from "@/locales/en.json";

vi.mock("vue-router", () => ({
  useRouter: () => vi.fn(),
  useRoute: () => ({
    hash: "events",
  }),
}));

describe("Pagination:", () => {
  const i18n = createI18n({
    locale: "en",
    allowComposition: true,
    messages: {
      en: enUS,
    },
  });

  it("renders default state properly", () => {
    const wrapper = mount(Pagination, {
      props: {
        activePage: 1,
        totalItems: 50,
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
        plugins: [i18n],
      },
    });
    const pageLinks = wrapper.findAllComponents(RouterLinkStub).filter((e) => e.classes().includes("page"));

    expect(pageLinks.length).toBe(5);
    expect(linkTo(pageLinks[0]!).query).toEqual({ pageSize: "10" });
    for (let a = 2; a < 5; a++) {
      expect(linkTo(pageLinks[a - 1]!).query!.page).toBe(a);
    }
    expect(wrapper.find(".pagination-page-button.arrow.left").exists()).toBe(true);
    expect(wrapper.find(".pagination-page-button.arrow.right").exists()).toBe(true);
  });
  it("pagination is disabled when disabled is true", () => {
    const wrapper = mount(Pagination, {
      props: {
        activePage: 1,
        totalItems: 50,
        disabled: true,
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
        plugins: [i18n],
      },
    });
    expect(wrapper.find(".page-numbers-container").classes("disabled")).toBe(true);
  });

  describe("Dots:", () => {
    it("pagination renders dots to the left", () => {
      const wrapper = mount(Pagination, {
        props: {
          activePage: 1,
          totalItems: 100,
        },
        global: {
          stubs: {
            RouterLink: RouterLinkStub,
          },
          plugins: [i18n],
        },
      });
      expect(wrapper.findAll(".dots").length).toBe(1);
      expect(wrapper.findAll(".pagination-page-button")[4].classes().includes("dots")).toBe(true);
    });
    it("pagination renders dots to the right", () => {
      const wrapper = mount(Pagination, {
        props: {
          activePage: 10,
          totalItems: 100,
        },
        global: {
          stubs: {
            RouterLink: RouterLinkStub,
          },
          plugins: [i18n],
        },
      });
      expect(wrapper.findAll(".dots").length).toBe(1);
      expect(wrapper.findAll(".pagination-page-button")[2].classes().includes("dots")).toBe(true);
    });
    it("pagination renders dots to the left and to the right", () => {
      const wrapper = mount(Pagination, {
        props: {
          activePage: 5,
          totalItems: 100,
        },
        global: {
          stubs: {
            RouterLink: RouterLinkStub,
          },
          plugins: [i18n],
        },
      });
      expect(wrapper.findAll(".dots").length).toBe(2);
      expect(wrapper.findAll(".pagination-page-button")[2].classes().includes("dots")).toBe(true);
      expect(wrapper.findAll(".pagination-page-button")[6].classes().includes("dots")).toBe(true);
    });
  });
  it("emits update:activePage when page updated", async () => {
    const wrapper = mount(Pagination, {
      props: {
        activePage: 5,
        totalItems: 100,
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
        plugins: [i18n],
      },
    });

    await fireEvent.click(wrapper.find(".pagination-page-button.right")!.element);
    expect(wrapper.emitted("update:activePage")).toEqual([[5], [5], [5], [6]]);
  });
  describe("Back & Next buttons:", () => {
    it("back button only has pageSize query and is disabled if first page is active", () => {
      const wrapper = mount(Pagination, {
        props: {
          activePage: 1,
          totalItems: 50,
        },
        global: {
          stubs: {
            RouterLink: RouterLinkStub,
          },
          plugins: [i18n],
        },
      });
      const pageLinks = wrapper.findAllComponents(RouterLinkStub).filter((e) => e.classes().includes("arrow"));
      expect(linkTo(pageLinks[0]!).query).toEqual({ pageSize: "10" });
      expect(pageLinks[0]!.classes().includes("disabled")).toEqual(true);
    });
    it("next button is disabled if last page is active", () => {
      const wrapper = mount(Pagination, {
        props: {
          activePage: 5,
          totalItems: 50,
        },
        global: {
          stubs: {
            RouterLink: RouterLinkStub,
          },
          plugins: [i18n],
        },
      });
      const pageLinks = wrapper.findAllComponents(RouterLinkStub).filter((e) => e.classes().includes("arrow"));
      expect(linkTo(pageLinks[1]!).query!.page).toBe(5);
      expect(pageLinks[1]!.classes().includes("disabled")).toEqual(true);
    });
    it("back and next button have correct query", () => {
      const wrapper = mount(Pagination, {
        props: {
          activePage: 3,
          totalItems: 50,
        },
        global: {
          stubs: {
            RouterLink: RouterLinkStub,
          },
          plugins: [i18n],
        },
      });
      const pageLinks = wrapper.findAllComponents(RouterLinkStub).filter((e) => e.classes().includes("arrow"));
      expect(linkTo(pageLinks[0]!).query!.page).toBe(2);
      expect(pageLinks[0]!.classes().includes("disabled")).toEqual(false);
      expect(linkTo(pageLinks[1]!).query!.page).toBe(4);
      expect(pageLinks[1]!.classes().includes("disabled")).toEqual(false);
    });
  });
  it("renders correct hash for the links if route hash exists", () => {
    const wrapper = mount(Pagination, {
      props: {
        activePage: 2,
        totalItems: 30,
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
        plugins: [i18n],
      },
    });
    const pageLinks = wrapper.findAllComponents(RouterLinkStub);

    expect(linkTo(pageLinks[0]!).hash).toBe("events");
    expect(linkTo(pageLinks[1]!).hash).toBe("events");
    expect(linkTo(pageLinks[2]!).hash).toBe("events");
    expect(linkTo(pageLinks[3]!).hash).toBe("events");
  });
});
