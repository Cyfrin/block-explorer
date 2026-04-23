import { ref } from "vue";
import { createI18n } from "vue-i18n";

import { describe, expect, it, vi } from "vitest";

import { mount } from "@vue/test-utils";

import { useTransactionMock } from "./../mocks";

import enUS from "@/locales/en.json";

import $testId from "@/plugins/testId";
import routes from "@/router/routes";
import TransactionView from "@/views/TransactionView.vue";

const router = {
  resolve: vi.fn(() => ({ name: "not-found", meta: { title: "404 Not Found" } })),
  replace: vi.fn(),
  currentRoute: {
    value: {},
  },
};

vi.mock("@/composables/useSearch", () => {
  return {
    default: () => ({
      getSearchRoute: () => null,
    }),
  };
});

vi.mock("vue-router", () => ({
  useRouter: () => router,
  useRoute: () => ({
    query: {},
  }),
  createWebHistory: () => vi.fn(),
  createRouter: () => vi.fn(),
}));

vi.mock("ohmyfetch", () => {
  return {
    $fetch: vi.fn(),
    FetchError: function error() {
      return;
    },
  };
});

describe("TransactionView:", () => {
  const i18n = createI18n({
    locale: "en",
    allowComposition: true,
    messages: {
      en: enUS,
    },
  });

  it("has correct title", async () => {
    expect(i18n.global.t(routes.find((e) => e.name === "transaction")?.meta?.title as string)).toBe("Transaction");
  });

  it("shows transaction not found when request returns 404", async () => {
    const isTransactionNotFound = ref(false);

    const mock = useTransactionMock({
      isTransactionNotFound,
    });

    const wrapper = mount(TransactionView, {
      props: {
        hash: "0x4d282bfaa673c686041a2e93ab0c1ca8ffc937a212b069669cd62c1725afc43d",
      },
      global: {
        stubs: ["router-link"],
        plugins: [i18n, $testId],
      },
    });

    // Simulate 404 by setting isTransactionNotFound to true
    isTransactionNotFound.value = true;
    await new Promise((resolve) => setImmediate(resolve));

    // The component should render the TransactionNotFound component
    expect(wrapper.html()).toContain("Transaction Not Found");
    mock.mockRestore();
  });
});
