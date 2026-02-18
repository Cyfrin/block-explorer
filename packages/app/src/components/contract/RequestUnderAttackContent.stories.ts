import RequestUnderAttackContent from "./RequestUnderAttackContent.vue";

import type { DetectedAgreement } from "@/composables/useAgreementList";
import type { Meta, StoryFn } from "@storybook/vue3";

const meta: Meta<typeof RequestUnderAttackContent> = {
  title: "Contract/RequestUnderAttackContent",
  component: RequestUnderAttackContent,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template:
        '<div style="display: flex; justify-content: center; padding: 1rem; background: var(--bg-secondary);"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "A three-step wizard for requesting 'under attack' mode for a contract. Step 1 selects an agreement (detected, pasted, or created). Step 2 reviews and submits the request. Step 3 shows success. This is the content component used inside RequestUnderAttackModal.",
      },
    },
  },
};

export default meta;

const contractAddress = "0xabcdef1234567890abcdef1234567890abcdef12";
const agreementAddress = "0x1234567890abcdef1234567890abcdef12345678";
const txHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

const mockAgreements: DetectedAgreement[] = [
  {
    agreementAddress: "0x1111111111111111111111111111111111111111",
    owner: "0x2222222222222222222222222222222222222222",
    protocolName: "Test Protocol",
    bountyPercentage: 10,
    bountyCapUsd: "100000000000",
    coveredContracts: [contractAddress],
  },
  {
    agreementAddress: "0x3333333333333333333333333333333333333333",
    owner: "0x4444444444444444444444444444444444444444",
    protocolName: "Another Protocol",
    bountyPercentage: 15,
    bountyCapUsd: "50000000000",
    coveredContracts: [contractAddress],
  },
];

// Step 1: Detected Agreements - Empty/Polling
export const Step1DetectedEmpty: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="1"
    override-selection-mode="detected"
    :override-agreements="[]"
    :override-is-polling="true"
  />`,
});
Step1DetectedEmpty.storyName = "Step 1: Detected (Polling, Empty)";
Step1DetectedEmpty.parameters = {
  docs: {
    description: {
      story:
        "Initial state with detected agreements mode selected, showing the polling indicator while checking for agreements.",
    },
  },
};

// Step 1: Detected Agreements - With Agreements
export const Step1DetectedWithAgreements: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  setup() {
    return { mockAgreements };
  },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="1"
    override-selection-mode="detected"
    :override-agreements="mockAgreements"
    :override-is-polling="true"
  />`,
});
Step1DetectedWithAgreements.storyName = "Step 1: Detected (With Agreements)";
Step1DetectedWithAgreements.parameters = {
  docs: {
    description: {
      story:
        "Detected agreements view showing a list of agreements that cover the target contract. User can click to select one.",
    },
  },
};

// Step 1: Detected Agreements - Agreement Selected
export const Step1DetectedSelected: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  setup() {
    return { mockAgreements };
  },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="1"
    override-selection-mode="detected"
    :override-agreements="mockAgreements"
    :override-is-polling="true"
    override-selected-agreement="${mockAgreements[0].agreementAddress}"
  />`,
});
Step1DetectedSelected.storyName = "Step 1: Detected (Agreement Selected)";
Step1DetectedSelected.parameters = {
  docs: {
    description: {
      story:
        "An agreement has been selected from the list, highlighting the selected card and enabling the Continue button.",
    },
  },
};

// Step 1: Detected - Waiting for Detection
export const Step1DetectedWaiting: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="1"
    override-selection-mode="detected"
    :override-agreements="[]"
    :override-is-polling="true"
    :override-waiting-for-detection="true"
    override-created-tx-hash="${txHash}"
  />`,
});
Step1DetectedWaiting.storyName = "Step 1: Detected (Waiting for Detection)";
Step1DetectedWaiting.parameters = {
  docs: {
    description: {
      story:
        "After creating a new agreement, shows a success banner with transaction link while polling for the agreement to appear.",
    },
  },
};

// Step 1: Detected - No Agreements Found
export const Step1DetectedNoAgreements: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="1"
    override-selection-mode="detected"
    :override-agreements="[]"
    :override-is-polling="false"
  />`,
});
Step1DetectedNoAgreements.storyName = "Step 1: Detected (No Agreements)";
Step1DetectedNoAgreements.parameters = {
  docs: {
    description: {
      story: "Empty state when polling has completed and no agreements were found covering the target contract.",
    },
  },
};

// Step 1: Paste Address - Empty
export const Step1PasteAddress: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="1"
    override-selection-mode="paste"
    :override-agreements="[]"
  />`,
});
Step1PasteAddress.storyName = "Step 1: Paste Address (Empty)";
Step1PasteAddress.parameters = {
  docs: {
    description: {
      story: "Paste address mode selected, showing an input field for the user to enter an agreement address.",
    },
  },
};

// Step 1: Create New Agreement
export const Step1CreateNew: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="1"
    override-selection-mode="create"
    :override-agreements="[]"
  />`,
});
Step1CreateNew.storyName = "Step 1: Create New Agreement";
Step1CreateNew.parameters = {
  docs: {
    description: {
      story: "Create new agreement mode, embedding the CreateAgreementContent form for creating a new agreement.",
    },
  },
};

// Step 2: Review (Wallet Connected, Commitment Sufficient)
export const Step2Review: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="2"
    override-selected-agreement="${agreementAddress}"
    :override-wallet-connected="true"
    :override-commitment-sufficient="true"
  />`,
});
Step2Review.storyName = "Step 2: Review (Connected)";
Step2Review.parameters = {
  docs: {
    description: {
      story:
        "Review step showing the selected agreement and contract addresses, with wallet connected, commitment sufficient, and ready to submit.",
    },
  },
};

// Step 2: Review (Wallet Not Connected)
export const Step2NotConnected: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="2"
    override-selected-agreement="${agreementAddress}"
    :override-wallet-connected="false"
    :override-commitment-sufficient="true"
  />`,
});
Step2NotConnected.storyName = "Step 2: Review (Not Connected)";
Step2NotConnected.parameters = {
  docs: {
    description: {
      story: "Review step when wallet is not connected, showing a prompt to connect before submitting.",
    },
  },
};

// Step 2: Submitting
export const Step2Submitting: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="2"
    override-selected-agreement="${agreementAddress}"
    :override-wallet-connected="true"
    :override-commitment-sufficient="true"
    :override-requesting="true"
  />`,
});
Step2Submitting.storyName = "Step 2: Submitting";
Step2Submitting.parameters = {
  docs: {
    description: {
      story: "State while the requestUnderAttack transaction is being processed.",
    },
  },
};

// Step 2: Error
export const Step2Error: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="2"
    override-selected-agreement="${agreementAddress}"
    :override-wallet-connected="true"
    :override-commitment-sufficient="true"
    override-error="User rejected the transaction"
  />`,
});
Step2Error.storyName = "Step 2: Error";
Step2Error.parameters = {
  docs: {
    description: {
      story: "State when the requestUnderAttack transaction fails, showing error message with retry option.",
    },
  },
};

// Step 2: Checking Commitment
export const Step2CheckingCommitment: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="2"
    override-selected-agreement="${agreementAddress}"
    :override-wallet-connected="true"
    :override-checking-commitment="true"
  />`,
});
Step2CheckingCommitment.storyName = "Step 2: Checking Commitment";
Step2CheckingCommitment.parameters = {
  docs: {
    description: {
      story: "Loading state while checking the agreement's commitment deadline on-chain.",
    },
  },
};

// Step 2: Commitment Insufficient
export const Step2CommitmentInsufficient: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="2"
    override-selected-agreement="${agreementAddress}"
    :override-wallet-connected="true"
    :override-commitment-sufficient="false"
    :override-checking-commitment="false"
  />`,
});
Step2CommitmentInsufficient.storyName = "Step 2: Commitment Insufficient";
Step2CommitmentInsufficient.parameters = {
  docs: {
    description: {
      story:
        "Warning state when the agreement's commitment window is insufficient. Shows a date picker and button to extend the commitment window. The submit button is disabled.",
    },
  },
};

// Step 2: Commitment Extend Error
export const Step2CommitmentExtendError: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="2"
    override-selected-agreement="${agreementAddress}"
    :override-wallet-connected="true"
    :override-commitment-sufficient="false"
    :override-checking-commitment="false"
    override-extend-error="User rejected the transaction"
  />`,
});
Step2CommitmentExtendError.storyName = "Step 2: Commitment Extend Error";
Step2CommitmentExtendError.parameters = {
  docs: {
    description: {
      story: "Error state when extending the commitment window fails.",
    },
  },
};

// Step 2: Commitment Extended Successfully
export const Step2CommitmentExtended: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="2"
    override-selected-agreement="${agreementAddress}"
    :override-wallet-connected="true"
    :override-commitment-sufficient="true"
    :override-checking-commitment="false"
    :override-commitment-extended-success="true"
  />`,
});
Step2CommitmentExtended.storyName = "Step 2: Commitment Extended";
Step2CommitmentExtended.parameters = {
  docs: {
    description: {
      story:
        "Success state after extending the commitment window. Shows a green success banner confirming the extension. The submit button is now enabled.",
    },
  },
};

// Step 3: Complete
export const Step3Complete: StoryFn = () => ({
  components: { RequestUnderAttackContent },
  template: `<RequestUnderAttackContent
    contract-address="${contractAddress}"
    :override-step="3"
    override-selected-agreement="${agreementAddress}"
    override-tx-hash="${txHash}"
  />`,
});
Step3Complete.storyName = "Step 3: Complete";
Step3Complete.parameters = {
  docs: {
    description: {
      story: "Success state after the transaction completes, showing confirmation banner and transaction link.",
    },
  },
};
