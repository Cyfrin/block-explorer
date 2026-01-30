import { computed, ref } from "vue";
import { createI18n } from "vue-i18n";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanup, fireEvent, render } from "@testing-library/vue";

import ContractNotRegistered from "@/components/contract/ContractNotRegistered.vue";

import enUS from "@/locales/en.json";

// Mock useContext
vi.mock("@/composables/useContext", () => {
  return {
    default: () => ({
      isReady: ref(true),
      currentNetwork: computed(() => ({
        l2NetworkName: "TestNet",
        rpcUrl: "https://rpc.test.com",
        attackRegistryAddress: "0x1234567890123456789012345678901234567890",
      })),
      networks: computed(() => []),
      getL2Provider: () => ({}),
    }),
  };
});

// Mock useContractRegistration
const mockConnect = vi.fn();
const mockRegisterDeployment = vi.fn();
const mockReset = vi.fn();

const mockWalletState = {
  walletAddress: ref<string | null>(null),
  isWalletConnected: computed(() => !!mockWalletState.walletAddress.value),
  isMetamaskInstalled: ref(true),
  isConnectPending: ref(false),
  isWalletReady: ref(true),
  isRegistering: ref(false),
  registrationError: ref<string | null>(null),
  registrationTxHash: ref<string | null>(null),
  connect: mockConnect,
  disconnect: vi.fn(),
  registerDeployment: mockRegisterDeployment,
  reset: mockReset,
};

vi.mock("@/composables/useContractRegistration", () => {
  return {
    default: () => mockWalletState,
  };
});

// Mock useWallet for onMounted initialization
vi.mock("@/composables/useWallet", () => {
  return {
    default: () => ({
      initialize: vi.fn(),
    }),
    processException: vi.fn((e) => e),
  };
});

describe("ContractNotRegistered", () => {
  const i18n = createI18n({
    locale: "en",
    allowComposition: true,
    messages: { en: enUS },
  });

  const defaultProps = {
    contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
  };

  beforeEach(() => {
    // Reset mocks and state
    vi.clearAllMocks();
    mockWalletState.walletAddress.value = null;
    mockWalletState.isMetamaskInstalled.value = true;
    mockWalletState.isConnectPending.value = false;
    mockWalletState.isRegistering.value = false;
    mockWalletState.registrationError.value = null;
    mockWalletState.registrationTxHash.value = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders warning message", () => {
    const { container } = render(ContractNotRegistered, {
      props: defaultProps,
      global: { plugins: [i18n] },
    });

    expect(container.textContent).toContain("Not Registered");
    expect(container.textContent).toContain("not registered in the attack registry");
  });

  it("renders warning about interaction risks", () => {
    const { container } = render(ContractNotRegistered, {
      props: defaultProps,
      global: { plugins: [i18n] },
    });

    expect(container.textContent).toContain("Consider this when deciding");
  });

  it("applies warning styling class", () => {
    const { container } = render(ContractNotRegistered, {
      props: defaultProps,
      global: { plugins: [i18n] },
    });

    expect(container.querySelector(".contract-not-registered")).toBeTruthy();
  });

  it("renders warning icon", () => {
    const { container } = render(ContractNotRegistered, {
      props: defaultProps,
      global: { plugins: [i18n] },
    });

    expect(container.querySelector(".icon")).toBeTruthy();
  });

  it("renders request attackable mode section", () => {
    const { container } = render(ContractNotRegistered, {
      props: defaultProps,
      global: { plugins: [i18n] },
    });

    expect(container.textContent).toContain("Request Attackable Mode");
  });

  describe("wallet not connected", () => {
    it("shows connect wallet prompt", () => {
      const { container } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Connect your wallet");
    });

    it("calls connect when button clicked", async () => {
      const { getByText } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      const connectButton = getByText("Connect your wallet");
      await fireEvent.click(connectButton);

      expect(mockConnect).toHaveBeenCalled();
    });

    it("shows connecting state", () => {
      mockWalletState.isConnectPending.value = true;

      const { container } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Connecting...");
    });

    it("shows no wallet message when MetaMask not installed", () => {
      mockWalletState.isMetamaskInstalled.value = false;

      const { container } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("No wallet detected");
    });
  });

  describe("wallet connected", () => {
    beforeEach(() => {
      mockWalletState.walletAddress.value = "0x1234567890123456789012345678901234567890";
    });

    it("shows request attackable mode button when wallet connected", () => {
      const { container } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Request Attackable Mode");
    });

    it("emits request-attackable-mode event when button clicked", async () => {
      const { getByText, emitted } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      const requestButton = getByText("Request Attackable Mode");
      await fireEvent.click(requestButton);

      expect(emitted()["request-attackable-mode"]).toBeTruthy();
    });
  });
});
