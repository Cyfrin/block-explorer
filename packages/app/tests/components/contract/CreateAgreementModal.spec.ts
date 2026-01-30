import { computed, ref } from "vue";
import { createI18n } from "vue-i18n";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanup, fireEvent, render } from "@testing-library/vue";

import CreateAgreementContent from "@/components/contract/CreateAgreementContent.vue";
import CreateAgreementModal from "@/components/contract/CreateAgreementModal.vue";

import enUS from "@/locales/en.json";

import $testId from "@/plugins/testId";

// Mock useContext
vi.mock("@/composables/useContext", () => {
  return {
    default: () => ({
      isReady: ref(true),
      currentNetwork: computed(() => ({
        l2NetworkName: "TestNet",
        l2ChainId: 270,
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
const mockCreateAgreement = vi.fn();
const mockAdoptSafeHarbor = vi.fn();
const mockReset = vi.fn();

const mockCreationState = {
  walletAddress: ref<string | null>("0x1234567890123456789012345678901234567890"),
  isWalletConnected: computed(() => !!mockCreationState.walletAddress.value),
  isMetamaskInstalled: ref(true),
  isConnectPending: ref(false),
  connect: vi.fn(),
  disconnect: vi.fn(),
  currentStep: ref(1),
  isComplete: ref(false),
  isCreatingAgreement: ref(false),
  createAgreementError: ref<string | null>(null),
  agreementAddress: ref<string | null>(null),
  createTxHash: ref<string | null>(null),
  createAgreement: mockCreateAgreement,
  isAdopting: ref(false),
  adoptError: ref<string | null>(null),
  adoptTxHash: ref<string | null>(null),
  adoptSafeHarbor: mockAdoptSafeHarbor,
  reset: mockReset,
  isWalletReady: ref(true),
};

vi.mock("@/composables/useAgreementCreation", () => {
  return {
    default: () => mockCreationState,
  };
});

vi.mock("@/composables/useWallet", () => {
  return {
    default: () => ({
      initialize: vi.fn(),
    }),
    processException: vi.fn((e) => e),
  };
});

describe("CreateAgreementModal", () => {
  const i18n = createI18n({
    locale: "en",
    allowComposition: true,
    messages: { en: enUS },
  });

  const defaultProps = {
    isOpen: true,
    contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
  };

  const global = {
    plugins: [i18n, $testId],
    components: {
      CreateAgreementContent,
    },
    stubs: {
      Popup: {
        template: '<div v-if="opened"><slot /></div>',
        props: ["opened"],
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreationState.currentStep.value = 1;
    mockCreationState.isCreatingAgreement.value = false;
    mockCreationState.createAgreementError.value = null;
    mockCreationState.agreementAddress.value = null;
    mockCreationState.createTxHash.value = null;
    mockCreationState.isAdopting.value = false;
    mockCreationState.adoptError.value = null;
    mockCreationState.adoptTxHash.value = null;
  });

  afterEach(() => {
    cleanup();
  });

  describe("step 1 - agreement form", () => {
    it("renders modal title", () => {
      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("Create Safe Harbor Agreement");
    });

    it("renders step indicator", () => {
      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("Create Agreement");
      expect(container.textContent).toContain("Adopt Agreement");
    });

    it("renders form fields", () => {
      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("Protocol Name");
      expect(container.textContent).toContain("Bounty Percentage");
      expect(container.textContent).toContain("Bounty Cap (USD)");
      expect(container.textContent).toContain("Identity Requirement");
      expect(container.textContent).toContain("Asset Recovery Address");
    });

    it("shows create button", () => {
      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("Create Safe Harbor Agreement");
    });

    it("shows creating state", () => {
      mockCreationState.isCreatingAgreement.value = true;

      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("Processing");
    });

    it("shows error message", () => {
      mockCreationState.createAgreementError.value = "Transaction failed";

      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("Transaction failed");
    });
  });

  describe("step 2 - adopt agreement", () => {
    beforeEach(() => {
      mockCreationState.currentStep.value = 2;
      mockCreationState.agreementAddress.value = "0x1111111111111111111111111111111111111111";
      mockCreationState.createTxHash.value = "0xabc123";
    });

    it("shows step 2 content", () => {
      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("Agreement contract created");
    });

    it("shows view transaction link", () => {
      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("View transaction");
    });

    it("shows adopting state", () => {
      mockCreationState.isAdopting.value = true;

      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("Processing");
    });

    it("shows adopt error message", () => {
      mockCreationState.adoptError.value = "Adoption failed";

      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("Adoption failed");
    });
  });

  describe("step 3 - complete", () => {
    beforeEach(() => {
      mockCreationState.currentStep.value = 3;
      mockCreationState.agreementAddress.value = "0x1111111111111111111111111111111111111111";
      mockCreationState.adoptTxHash.value = "0xdef456";
    });

    it("shows success message", () => {
      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("Safe Harbor Agreement Created");
    });

    it("shows done button", () => {
      const { container } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      expect(container.textContent).toContain("Done");
    });
  });

  describe("events", () => {
    it("emits close event when cancel clicked", async () => {
      const { getByText, emitted } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      const cancelButton = getByText("Cancel");
      await fireEvent.click(cancelButton);

      expect(emitted().close).toBeTruthy();
    });

    it("emits close event when close button clicked", async () => {
      const { container, emitted } = render(CreateAgreementModal, {
        props: defaultProps,
        global,
      });

      const closeButton = container.querySelector(".close-button");
      if (closeButton) {
        await fireEvent.click(closeButton);
        expect(emitted().close).toBeTruthy();
      }
    });
  });
});
