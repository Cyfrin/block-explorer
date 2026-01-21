import ContractNotRegistered from "./ContractNotRegistered.vue";

export default {
  title: "Contract/ContractNotRegistered",
  component: ContractNotRegistered,
};

const Template = () => ({
  components: { ContractNotRegistered },
  template: `<ContractNotRegistered />`,
});

export const Default = Template.bind({});
