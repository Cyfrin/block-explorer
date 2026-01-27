import CommitmentWindowStatus from "./CommitmentWindowStatus.vue";

export default {
  title: "Contract/CommitmentWindowStatus",
  component: CommitmentWindowStatus,
};

type Args = {
  deadline: number | null;
  isEditing: boolean;
};

const Template = (args: Args) => ({
  components: { CommitmentWindowStatus },
  setup() {
    const onUpdateDeadline = (value: number) => {
      console.log("New deadline:", value, new Date(value));
    };
    return { ...args, onUpdateDeadline };
  },
  template: `<CommitmentWindowStatus :deadline="deadline" :is-editing="isEditing" @update:deadline="onUpdateDeadline" />`,
});

const now = Date.now();
const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
const inOneWeek = now + 7 * 24 * 60 * 60 * 1000;

// Display mode - locked (deadline in future)
export const LockedDisplay = Template.bind({}) as unknown as { args: Args };
LockedDisplay.args = {
  deadline: inOneWeek,
  isEditing: false,
};

// Display mode - unlocked (deadline passed)
export const UnlockedDisplay = Template.bind({}) as unknown as { args: Args };
UnlockedDisplay.args = {
  deadline: oneWeekAgo,
  isEditing: false,
};

// Display mode - no deadline
export const NoDeadlineDisplay = Template.bind({}) as unknown as { args: Args };
NoDeadlineDisplay.args = {
  deadline: null,
  isEditing: false,
};

// Edit mode - with existing deadline (should show validation error initially)
export const EditModeWithDeadline = Template.bind({}) as unknown as { args: Args };
EditModeWithDeadline.args = {
  deadline: inOneWeek,
  isEditing: true,
};

// Edit mode - no existing deadline
export const EditModeNoDeadline = Template.bind({}) as unknown as { args: Args };
EditModeNoDeadline.args = {
  deadline: null,
  isEditing: true,
};
