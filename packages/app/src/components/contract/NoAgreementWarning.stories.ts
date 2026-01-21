import NoAgreementWarning from "./NoAgreementWarning.vue";

export default {
  title: "Contract/NoAgreementWarning",
  component: NoAgreementWarning,
};

type Args = {
  bountyPercentage: number;
  bountyCapString: string;
};

const Template = (args: Args) => ({
  components: { NoAgreementWarning },
  setup() {
    // Convert string to BigInt inside setup to avoid serialization issues
    const defaultTerms = {
      bountyPercentage: args.bountyPercentage,
      bountyCap: BigInt(args.bountyCapString),
    };
    return { defaultTerms };
  },
  template: `<NoAgreementWarning :defaultTerms="defaultTerms" />`,
});

export const Default = Template.bind({}) as unknown as { args: Args };
Default.args = {
  bountyPercentage: 10,
  bountyCapString: "5000000000000", // $5M USDC
};

export const CustomTerms = Template.bind({}) as unknown as { args: Args };
CustomTerms.args = {
  bountyPercentage: 5,
  bountyCapString: "1000000000000", // $1M USDC
};
