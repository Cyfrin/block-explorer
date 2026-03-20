import { ref } from "vue";

import ContactsForm from "./ContactsForm.vue";

import type { ContactDetail } from "@/types";

export default {
  title: "Contract/ContactsForm",
  component: ContactsForm,
};

const Template = (args: { modelValue: ContactDetail[] }) => ({
  components: { ContactsForm },
  setup() {
    const model = ref([...args.modelValue]);
    const onChange = (val: ContactDetail[]) => {
      model.value = val;
      console.log("Contacts:", JSON.stringify(val, null, 2));
    };
    return { model, onChange };
  },
  template: `
    <div style="max-width: 500px; padding: 16px;">
      <ContactsForm
        :model-value="model"
        @update:model-value="onChange"
      />
      <pre style="margin-top: 16px; padding: 8px; font-size: 12px; background: #f5f5f5; border-radius: 4px;">{{ JSON.stringify(model, null, 2) }}</pre>
    </div>
  `,
});

// Empty state (starts with one blank row)
export const Empty = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
Empty.args = {
  modelValue: [],
};

// Pre-filled contacts
export const WithContacts = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
WithContacts.args = {
  modelValue: [
    { name: "Security Team", contact: "security@example.com" },
    { name: "Discord", contact: "example-protocol" },
    { name: "Telegram", contact: "@exampleprotocol" },
  ],
};

// Single contact
export const SingleContact = Template.bind({}) as unknown as { args: Parameters<typeof Template>[0] };
SingleContact.args = {
  modelValue: [{ name: "Security", contact: "security@example.com" }],
};
