import { computed, ref } from "vue";
import { createI18n } from "vue-i18n";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanup, fireEvent, render } from "@testing-library/vue";

import NoAgreementWarning from "@/components/contract/NoAgreementWarning.vue";

import enUS from "@/locales/en.json";

// Mock useContext
vi.mock("@/composables/useContext", () => {
  return {
    default: () => ({
      isReady: ref(true),
      currentNetwork: computed(() => ({
        l2NetworkName: "TestNet",
        rpcUrl: "https://rpc.test.com",
        agreementFactoryAddress: "0x1234567890123456789012345678901234567890",
        safeHarborRegistryAddress: "0x0987654321098765432109876543210987654321",
      })),
      networks: computed(() => []),
      getL2Provider: () => ({}),
    }),
  };
});

// Mock useAgreementCreation
const mockConnect = vi.fn();

const walletAddress = ref<string | null>(null);
const mockCreationState = {
  walletAddress,
  isWalletConnected: computed(() => !!walletAddress.value),
  isMetamaskInstalled: ref(true),
  isConnectPending: ref(false),
  connect: mockConnect,
  disconnect: vi.fn(),
  currentStep: ref(1),
  isComplete: ref(false),
  isCreatingAgreement: ref(false),
  createAgreementError: ref<string | null>(null),
  agreementAddress: ref<string | null>(null),
  createTxHash: ref<string | null>(null),
  createAgreement: vi.fn(),
  isAdopting: ref(false),
  adoptError: ref<string | null>(null),
  adoptTxHash: ref<string | null>(null),
  adoptSafeHarbor: vi.fn(),
  reset: vi.fn(),
  isWalletReady: ref(true),
};

vi.mock("@/composables/useAgreementCreation", () => {
  return {
    default: () => mockCreationState,
  };
});

// Mock useWallet for CreateAgreementModal
vi.mock("@/composables/useWallet", () => {
  return {
    default: () => ({
      initialize: vi.fn(),
    }),
    processException: vi.fn((e) => e),
  };
});

// Mock useContractAuthorization so the component doesn't make API calls
const mockAuthState = {
  authorizedOwner: ref<string | null>(null),
  isDeployedViaBattleChain: ref(false),
  isLoading: ref(false),
  error: ref<string | null>(null),
};

vi.mock("@/composables/useContractAuthorization", () => {
  return {
    default: () => ({
      authorizedOwner: mockAuthState.authorizedOwner,
      isAuthorized: computed(
        () =>
          !!mockCreationState.walletAddress.value &&
          !!mockAuthState.authorizedOwner.value &&
          mockCreationState.walletAddress.value.toLowerCase() === mockAuthState.authorizedOwner.value.toLowerCase()
      ),
      isDeployedViaBattleChain: mockAuthState.isDeployedViaBattleChain,
      isLoading: mockAuthState.isLoading,
      error: mockAuthState.error,
      refetch: vi.fn(),
    }),
  };
});

describe("NoAgreementWarning", () => {
  const i18n = createI18n({
    locale: "en",
    allowComposition: true,
    messages: { en: enUS },
  });

  const defaultProps = {
    contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreationState.walletAddress.value = null;
    mockCreationState.isMetamaskInstalled.value = true;
    mockCreationState.isConnectPending.value = false;
    mockAuthState.authorizedOwner.value = null;
    mockAuthState.isDeployedViaBattleChain.value = false;
    mockAuthState.isLoading.value = false;
    mockAuthState.error.value = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders warning message", () => {
    const { container } = render(NoAgreementWarning, {
      props: defaultProps,
      global: { plugins: [i18n] },
    });

    expect(container.textContent).toContain("does not have a registered Safe Harbor Agreement");
  });

  it("applies warning styling", () => {
    const { container } = render(NoAgreementWarning, {
      props: defaultProps,
      global: { plugins: [i18n] },
    });

    expect(container.querySelector(".no-agreement-warning")).toBeTruthy();
  });

  it("renders warning icon", () => {
    const { container } = render(NoAgreementWarning, {
      props: defaultProps,
      global: { plugins: [i18n] },
    });

    expect(container.querySelector(".warning-icon")).toBeTruthy();
  });

  describe("wallet not connected", () => {
    it("shows connect wallet prompt", () => {
      const { container } = render(NoAgreementWarning, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Is this contract yours?");
      expect(container.textContent).toContain("Connect your wallet");
    });

    it("calls connect when button clicked", async () => {
      const { getByText } = render(NoAgreementWarning, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      const connectButton = getByText("Connect your wallet");
      await fireEvent.click(connectButton);

      expect(mockConnect).toHaveBeenCalled();
    });

    it("shows connecting state", () => {
      mockCreationState.isConnectPending.value = true;

      const { container } = render(NoAgreementWarning, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Connecting...");
    });

    it("shows no wallet message when MetaMask not installed", () => {
      mockCreationState.isMetamaskInstalled.value = false;

      const { container } = render(NoAgreementWarning, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("No wallet detected");
    });
  });

  describe("wallet connected", () => {
    beforeEach(() => {
      mockCreationState.walletAddress.value = "0x1234567890123456789012345678901234567890";
    });

    it("shows create button when wallet connected as owner", () => {
      const { container } = render(NoAgreementWarning, {
        props: defaultProps,
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Create Safe Harbor Agreement");
    });

    it("shows not owner message when wallet is not the contract deployer", () => {
      // BC-deployed contract where current wallet is not the authorized owner
      mockAuthState.isDeployedViaBattleChain.value = true;
      mockAuthState.authorizedOwner.value = "0x2222222222222222222222222222222222222222";

      const { container } = render(NoAgreementWarning, {
        props: {
          ...defaultProps,
          creatorAddress: "0x2222222222222222222222222222222222222222",
        },
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("not the deployer");
      expect(container.textContent).not.toContain("Create Safe Harbor Agreement");
    });

    it("shows create button when wallet matches creator address", () => {
      const { container } = render(NoAgreementWarning, {
        props: {
          ...defaultProps,
          creatorAddress: "0x1234567890123456789012345678901234567890",
        },
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Create Safe Harbor Agreement");
      expect(container.textContent).not.toContain("not the deployer");
    });

    it("handles case-insensitive address comparison", () => {
      const { container } = render(NoAgreementWarning, {
        props: {
          ...defaultProps,
          creatorAddress: "0x1234567890123456789012345678901234567890".toUpperCase(),
        },
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Create Safe Harbor Agreement");
      expect(container.textContent).not.toContain("not the deployer");
    });

    it("assumes owner when creatorAddress is null", () => {
      const { container } = render(NoAgreementWarning, {
        props: {
          ...defaultProps,
          creatorAddress: null,
        },
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Create Safe Harbor Agreement");
      expect(container.textContent).not.toContain("not the deployer");
    });
  });

  describe("override props", () => {
    it("respects overrideWalletConnected", () => {
      const { container } = render(NoAgreementWarning, {
        props: {
          ...defaultProps,
          overrideWalletConnected: true,
        },
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("Create Safe Harbor Agreement");
    });

    it("respects overrideMetamaskInstalled", () => {
      const { container } = render(NoAgreementWarning, {
        props: {
          ...defaultProps,
          overrideMetamaskInstalled: false,
        },
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("No wallet detected");
    });

    it("respects overrideIsOwner", () => {
      const { container } = render(NoAgreementWarning, {
        props: {
          ...defaultProps,
          overrideWalletConnected: true,
          overrideIsOwner: false,
        },
        global: { plugins: [i18n] },
      });

      expect(container.textContent).toContain("not the deployer");
    });
  });
});
