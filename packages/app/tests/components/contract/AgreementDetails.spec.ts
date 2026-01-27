import { createI18n } from "vue-i18n";

import { describe, expect, it } from "vitest";

import { render } from "@testing-library/vue";

import AgreementDetails from "@/components/contract/AgreementDetails.vue";

import enUS from "@/locales/en.json";

import type { SafeHarborAgreement } from "@/types";

const i18n = createI18n({
  locale: "en",
  allowComposition: true,
  messages: {
    en: enUS,
  },
});

const global = {
  plugins: [i18n],
  stubs: {
    AddressLink: {
      template: "<a class='address-link'><slot /></a>",
      props: ["address"],
    },
    CopyButton: {
      template: "<span class='copy-button'><slot /></span>",
      props: ["value"],
    },
    TimeField: {
      template: "<span class='time-field'>time</span>",
      props: ["value", "format"],
    },
    CommitmentWindowStatus: {
      template: "<div class='commitment-status'>Commitment Status</div>",
      props: ["deadline"],
    },
  },
};

const now = Date.now();
const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

const fullAgreement: SafeHarborAgreement = {
  agreementAddress: "0x1234567890123456789012345678901234567890",
  owner: "0x1111111111111111111111111111111111111111",
  protocolName: "Test DeFi Protocol",
  bountyPercentage: 15,
  bountyCapUsd: "5000000", // $5M
  identityRequirement: "Anonymous",
  retainable: false,
  coveredContracts: ["0xabcdef1234567890abcdef1234567890abcdef12", "0x1111111111111111111111111111111111111111"],
  contactDetails: [
    { name: "Email", contact: "security@example.com" },
    { name: "Discord", contact: "example-protocol" },
    { name: "Telegram", contact: "@exampleprotocol" },
  ],
  commitmentDeadline: now + 7 * 24 * 60 * 60 * 1000,
  agreementURI: "ipfs://QmYwAPJzv5CZsnAzt8auVZRn1W2R5sHMN8LNxmhQHBvqJ4",
  registeredAt: oneWeekAgo,
  lastModified: oneWeekAgo,
};

describe("AgreementDetails", () => {
  it("renders protocol name", () => {
    const { container } = render(AgreementDetails, {
      props: {
        agreement: fullAgreement,
      },
      global,
    });

    expect(container.textContent).toContain("Test DeFi Protocol");
  });

  it("renders bounty percentage", () => {
    const { container } = render(AgreementDetails, {
      props: {
        agreement: fullAgreement,
      },
      global,
    });

    expect(container.textContent).toContain("15%");
  });

  it("renders formatted bounty cap", () => {
    const { container } = render(AgreementDetails, {
      props: {
        agreement: fullAgreement,
      },
      global,
    });

    expect(container.textContent).toContain("$5,000,000");
  });

  it("renders allowed indicator when anonymous is true", () => {
    const { container } = render(AgreementDetails, {
      props: {
        agreement: fullAgreement,
      },
      global,
    });

    expect(container.querySelector(".allowed")).toBeTruthy();
  });

  it("renders not-allowed indicator when identityRequirement is Named", () => {
    const agreementNamed: SafeHarborAgreement = { ...fullAgreement, identityRequirement: "Named" };
    const { container } = render(AgreementDetails, {
      props: {
        agreement: agreementNamed,
      },
      global,
    });

    expect(container.querySelector(".not-allowed")).toBeTruthy();
  });

  it("renders contact email", () => {
    const { container } = render(AgreementDetails, {
      props: {
        agreement: fullAgreement,
      },
      global,
    });

    expect(container.textContent).toContain("security@example.com");
  });

  it("renders contact discord", () => {
    const { container } = render(AgreementDetails, {
      props: {
        agreement: fullAgreement,
      },
      global,
    });

    expect(container.textContent).toContain("example-protocol");
  });

  it("renders contact telegram", () => {
    const { container } = render(AgreementDetails, {
      props: {
        agreement: fullAgreement,
      },
      global,
    });

    expect(container.textContent).toContain("@exampleprotocol");
  });

  it("renders no contact info message when no contacts", () => {
    const noContactAgreement: SafeHarborAgreement = {
      ...fullAgreement,
      contactDetails: [],
    };
    const { container } = render(AgreementDetails, {
      props: {
        agreement: noContactAgreement,
      },
      global,
    });

    expect(container.querySelector(".no-contacts")).toBeTruthy();
  });

  it("renders covered contracts", () => {
    const { container } = render(AgreementDetails, {
      props: {
        agreement: fullAgreement,
      },
      global,
    });

    const coveredContracts = container.querySelectorAll(".covered-contract");
    expect(coveredContracts.length).toBe(2);
  });

  it("renders agreement URI as link", () => {
    const { container } = render(AgreementDetails, {
      props: {
        agreement: fullAgreement,
      },
      global,
    });

    const links = container.querySelectorAll("a.link");
    expect(links.length).toBeGreaterThan(0);
  });

  it("renders commitment window status", () => {
    const { container } = render(AgreementDetails, {
      props: {
        agreement: fullAgreement,
      },
      global,
    });

    expect(container.querySelector(".commitment-status")).toBeTruthy();
  });

  it("formats smaller bounty cap correctly", () => {
    const smallCapAgreement: SafeHarborAgreement = { ...fullAgreement, bountyCapUsd: "100000" }; // $100K
    const { container } = render(AgreementDetails, {
      props: {
        agreement: smallCapAgreement,
      },
      global,
    });

    expect(container.textContent).toContain("$100,000");
  });

  describe("edit mode", () => {
    const globalWithEditStubs = {
      ...global,
      stubs: {
        ...global.stubs,
        EditableSection: {
          template: `<div class="editable-section" :class="{ editing: isEditing, 'full-width': $attrs.class?.includes('full-width') }">
            <div class="section-header">
              <span class="section-title">{{ title }}</span>
              <button v-if="canEdit && !isEditing" class="btn-edit" @click="$emit('edit')">Edit</button>
              <button v-if="isEditing" class="btn-save" @click="$emit('save')">Save</button>
              <button v-if="isEditing" class="btn-cancel" @click="$emit('cancel')">Cancel</button>
            </div>
            <slot v-if="!isEditing" />
            <slot v-else name="edit-form" />
          </div>`,
          props: ["title", "isEditing", "canEdit", "isSaving", "error"],
        },
        BountyTermsForm: {
          template: "<div class='bounty-terms-form'>Bounty Form</div>",
          props: ["modelValue"],
        },
        ContactsForm: {
          template: "<div class='contacts-form'>Contacts Form</div>",
          props: ["modelValue"],
        },
        CoveredContractsForm: {
          template: "<div class='covered-contracts-form'>Covered Contracts Form</div>",
          props: ["modelValue", "existingContracts"],
        },
        Spinner: {
          template: "<span class='spinner' />",
        },
      },
    };

    it("does not show edit buttons when not owner", () => {
      const { container } = render(AgreementDetails, {
        props: {
          agreement: fullAgreement,
          owner: fullAgreement.owner,
          walletAddress: null,
        },
        global: globalWithEditStubs,
      });

      expect(container.querySelectorAll(".btn-edit").length).toBe(0);
    });

    it("does not show edit buttons when different wallet connected", () => {
      const { container } = render(AgreementDetails, {
        props: {
          agreement: fullAgreement,
          owner: fullAgreement.owner,
          walletAddress: "0x9999999999999999999999999999999999999999",
        },
        global: globalWithEditStubs,
      });

      expect(container.querySelectorAll(".btn-edit").length).toBe(0);
    });

    it("shows edit buttons when owner wallet is connected", () => {
      const { container } = render(AgreementDetails, {
        props: {
          agreement: fullAgreement,
          owner: fullAgreement.owner,
          walletAddress: fullAgreement.owner,
        },
        global: globalWithEditStubs,
      });

      // Should have edit buttons for bounty terms, contacts, covered contracts, and agreement URI
      const editButtons = container.querySelectorAll(".btn-edit");
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it("shows edit button for protocol name when owner", () => {
      const { container } = render(AgreementDetails, {
        props: {
          agreement: fullAgreement,
          owner: fullAgreement.owner,
          walletAddress: fullAgreement.owner,
        },
        global: globalWithEditStubs,
      });

      // The inline edit button for protocol name
      expect(container.querySelector(".btn-inline-edit")).toBeTruthy();
    });

    it("hides protocol name edit button when not owner", () => {
      const { container } = render(AgreementDetails, {
        props: {
          agreement: fullAgreement,
          owner: fullAgreement.owner,
          walletAddress: null,
        },
        global: globalWithEditStubs,
      });

      expect(container.querySelector(".btn-inline-edit")).toBeFalsy();
    });
  });
});
