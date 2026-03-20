import { ref } from "vue";

import BountyTermsForm from "./BountyTermsForm.vue";
import ContactsForm from "./ContactsForm.vue";
import CoveredContractsForm from "./CoveredContractsForm.vue";
import EditableSection from "./EditableSection.vue";

import type { BountyTermsFormData } from "./BountyTermsForm.vue";
import type { CoveredContractsChange } from "./CoveredContractsForm.vue";
import type { ContactDetail } from "@/types";

export default {
  title: "Contract/EditableSection",
  component: EditableSection,
};

// --- Bounty Terms in EditableSection ---

const BountyTermsTemplate = (args: { isEditing: boolean; isLocked: boolean }) => ({
  components: { EditableSection, BountyTermsForm },
  setup() {
    const isEditing = ref(args.isEditing);
    const isSaving = ref(false);
    const bountyTerms = ref<BountyTermsFormData>({
      bountyPercentage: 15,
      bountyCapUsd: "5,000,000",
      retainable: false,
      identityRequirement: "Anonymous",
      diligenceRequirements: "",
      aggregateBountyCapUsd: "",
    });
    const onEdit = () => {
      isEditing.value = true;
    };
    const onCancel = () => {
      isEditing.value = false;
    };
    const onSave = () => {
      isSaving.value = true;
      setTimeout(() => {
        isSaving.value = false;
        isEditing.value = false;
      }, 1500);
    };
    return { isEditing, isSaving, bountyTerms, isLocked: args.isLocked, onEdit, onCancel, onSave };
  },
  template: `
    <div style="max-width: 500px; padding: 16px;">
      <EditableSection
        title="Bounty Terms"
        :is-editing="isEditing"
        :can-edit="true"
        :is-saving="isSaving"
        @edit="onEdit"
        @save="onSave"
        @cancel="onCancel"
      >
        <template #default>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div><span style="color: #888; font-size: 12px;">Bounty Percentage:</span> <strong>{{ bountyTerms.bountyPercentage }}%</strong></div>
            <div><span style="color: #888; font-size: 12px;">Bounty Cap:</span> <strong>\${{ bountyTerms.bountyCapUsd }}</strong></div>
            <div><span style="color: #888; font-size: 12px;">Identity:</span> <strong>{{ bountyTerms.identityRequirement }}</strong></div>
            <div><span style="color: #888; font-size: 12px;">Retainable:</span> <strong>{{ bountyTerms.retainable ? 'Yes' : 'No' }}</strong></div>
          </div>
        </template>
        <template #edit-form>
          <BountyTermsForm v-model="bountyTerms" :is-locked="isLocked" :original-values="isLocked ? bountyTerms : null" />
        </template>
      </EditableSection>
    </div>
  `,
});

export const BountyTermsDisplay = BountyTermsTemplate.bind({}) as unknown as {
  args: { isEditing: boolean; isLocked: boolean };
};
BountyTermsDisplay.args = { isEditing: false, isLocked: false };

export const BountyTermsEditing = BountyTermsTemplate.bind({}) as unknown as {
  args: { isEditing: boolean; isLocked: boolean };
};
BountyTermsEditing.args = { isEditing: true, isLocked: false };

export const BountyTermsEditingLocked = BountyTermsTemplate.bind({}) as unknown as {
  args: { isEditing: boolean; isLocked: boolean };
};
BountyTermsEditingLocked.args = { isEditing: true, isLocked: true };

// --- Contacts in EditableSection ---

const ContactsTemplate = (args: { isEditing: boolean }) => ({
  components: { EditableSection, ContactsForm },
  setup() {
    const isEditing = ref(args.isEditing);
    const isSaving = ref(false);
    const contacts = ref<ContactDetail[]>([
      { name: "Security Team", contact: "security@example.com" },
      { name: "Discord", contact: "example-protocol" },
    ]);
    const onEdit = () => {
      isEditing.value = true;
    };
    const onCancel = () => {
      isEditing.value = false;
    };
    const onSave = () => {
      isSaving.value = true;
      setTimeout(() => {
        isSaving.value = false;
        isEditing.value = false;
      }, 1500);
    };
    return { isEditing, isSaving, contacts, onEdit, onCancel, onSave };
  },
  template: `
    <div style="max-width: 500px; padding: 16px;">
      <EditableSection
        title="Contact Information"
        :is-editing="isEditing"
        :can-edit="true"
        :is-saving="isSaving"
        @edit="onEdit"
        @save="onSave"
        @cancel="onCancel"
      >
        <template #default>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div v-for="(c, i) in contacts" :key="i">
              <span style="color: #888; font-size: 12px;">{{ c.name }}:</span> {{ c.contact }}
            </div>
          </div>
        </template>
        <template #edit-form>
          <ContactsForm v-model="contacts" />
        </template>
      </EditableSection>
    </div>
  `,
});

export const ContactsDisplay = ContactsTemplate.bind({}) as unknown as { args: { isEditing: boolean } };
ContactsDisplay.args = { isEditing: false };

export const ContactsEditing = ContactsTemplate.bind({}) as unknown as { args: { isEditing: boolean } };
ContactsEditing.args = { isEditing: true };

// --- Covered Contracts in EditableSection ---

const sampleContracts = [
  "0xabcdef1234567890abcdef1234567890abcdef12",
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
];

const CoveredContractsTemplate = (args: { isEditing: boolean; isLocked: boolean }) => ({
  components: { EditableSection, CoveredContractsForm },
  setup() {
    const isEditing = ref(args.isEditing);
    const isSaving = ref(false);
    const coveredContracts = ref<CoveredContractsChange>({ toAdd: [], toRemove: [] });
    const onEdit = () => {
      isEditing.value = true;
    };
    const onCancel = () => {
      isEditing.value = false;
    };
    const onSave = () => {
      isSaving.value = true;
      setTimeout(() => {
        isSaving.value = false;
        isEditing.value = false;
      }, 1500);
    };
    return {
      isEditing,
      isSaving,
      coveredContracts,
      existingContracts: sampleContracts,
      isLocked: args.isLocked,
      onEdit,
      onCancel,
      onSave,
    };
  },
  template: `
    <div style="max-width: 600px; padding: 16px;">
      <EditableSection
        title="Covered Contracts"
        :is-editing="isEditing"
        :can-edit="true"
        :is-saving="isSaving"
        @edit="onEdit"
        @save="onSave"
        @cancel="onCancel"
      >
        <template #default>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <code v-for="addr in existingContracts" :key="addr" style="font-size: 12px; padding: 2px 8px; background: #f0f0f0; border-radius: 4px;">
              {{ addr.slice(0, 6) }}...{{ addr.slice(-4) }}
            </code>
          </div>
        </template>
        <template #edit-form>
          <CoveredContractsForm
            v-model="coveredContracts"
            :existing-contracts="existingContracts"
            :is-locked="isLocked"
          />
        </template>
      </EditableSection>
    </div>
  `,
});

export const CoveredContractsDisplay = CoveredContractsTemplate.bind({}) as unknown as {
  args: { isEditing: boolean; isLocked: boolean };
};
CoveredContractsDisplay.args = { isEditing: false, isLocked: false };

export const CoveredContractsEditing = CoveredContractsTemplate.bind({}) as unknown as {
  args: { isEditing: boolean; isLocked: boolean };
};
CoveredContractsEditing.args = { isEditing: true, isLocked: false };

export const CoveredContractsEditingLocked = CoveredContractsTemplate.bind({}) as unknown as {
  args: { isEditing: boolean; isLocked: boolean };
};
CoveredContractsEditingLocked.args = { isEditing: true, isLocked: true };
