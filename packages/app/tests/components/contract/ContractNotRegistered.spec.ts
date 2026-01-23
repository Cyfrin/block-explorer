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
const mockRegisterContract = vi.fn();
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
  registerContract: mockRegisterContract,
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

  describe("wallet not connected", () => {
    it("shows connect wallet prompt", () => {
      const { container } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Is this contract yours?");
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

    it("shows register button when wallet connected", () => {
      const { container } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Register Contract");
    });

    it("calls registerContract when button clicked", async () => {
      const { getByText } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      const registerButton = getByText("Register Contract");
      await fireEvent.click(registerButton);

      expect(mockRegisterContract).toHaveBeenCalledWith(defaultProps.contractAddress);
    });

    it("shows registering state", () => {
      mockWalletState.isRegistering.value = true;

      const { container } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Registering...");
    });

    it("shows error message with retry option", () => {
      mockWalletState.registrationError.value = "Transaction rejected";

      const { container } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Transaction rejected");
      expect(container.textContent).toContain("Try again");
    });

    it("calls reset when try again clicked", async () => {
      mockWalletState.registrationError.value = "Transaction rejected";

      const { getByText } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      const tryAgainButton = getByText("Try again");
      await fireEvent.click(tryAgainButton);

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe("registration success", () => {
    beforeEach(() => {
      mockWalletState.walletAddress.value = "0x1234567890123456789012345678901234567890";
      mockWalletState.registrationTxHash.value = "0xabcdef1234567890";
    });

    it("shows success message", () => {
      const { container } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Contract registered!");
    });

    it("shows view transaction link", () => {
      const { container } = render(ContractNotRegistered, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("View transaction");
      const txLink = container.querySelector(".tx-link");
      expect(txLink).toBeTruthy();
      expect(txLink?.getAttribute("href")).toContain("0xabcdef1234567890");
    });
  });

  describe("not owner", () => {
    beforeEach(() => {
      mockWalletState.walletAddress.value = "0x1111111111111111111111111111111111111111";
    });

    it("shows not owner message when wallet is not the contract deployer", () => {
      const { container } = render(ContractNotRegistered, {
        props: {
          ...defaultProps,
          creatorAddress: "0x2222222222222222222222222222222222222222",
        },
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("not the deployer");
      expect(container.textContent).not.toContain("Register Contract");
    });

    it("shows register button when wallet matches creator address", () => {
      const { container } = render(ContractNotRegistered, {
        props: {
          ...defaultProps,
          creatorAddress: "0x1111111111111111111111111111111111111111",
        },
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Register Contract");
      expect(container.textContent).not.toContain("not the deployer");
    });

    it("handles case-insensitive address comparison", () => {
      const { container } = render(ContractNotRegistered, {
        props: {
          ...defaultProps,
          creatorAddress: "0x1111111111111111111111111111111111111111".toUpperCase(),
        },
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Register Contract");
      expect(container.textContent).not.toContain("not the deployer");
    });

    it("assumes owner when creatorAddress is null", () => {
      const { container } = render(ContractNotRegistered, {
        props: {
          ...defaultProps,
          creatorAddress: null,
        },
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Register Contract");
      expect(container.textContent).not.toContain("not the deployer");
    });
  });
});
