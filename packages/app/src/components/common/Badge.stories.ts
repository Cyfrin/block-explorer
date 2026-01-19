import { ClipboardCheckIcon } from "@heroicons/vue/outline";

import Badge from "./Badge.vue";

export default {
  title: "Common/Badge",
  component: Badge,
};

type Args = {
  size?: "sm" | "md";
  color?: "neutral" | "success" | "warning" | "error" | "accent";
  defaultSlot?: string;
  icon?: unknown;
  showDot?: boolean;
  tooltip?: string;
}[];

const colors: Array<"neutral" | "success" | "warning" | "error" | "accent"> = [
  "neutral",
  "success",
  "warning",
  "error",
  "accent",
];

const Template = (variants: Args) => ({
  components: { Badge },
  setup() {
    return { variants };
  },
  template: `
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <Badge v-for="(item, index) in variants" :key="index" :color="item.color" :size="item.size" :tooltip="item.tooltip" :show-dot="item.showDot">
        <template #icon v-if="item.icon">
          <component :is="item.icon" />
        </template>
        <template #default v-if="item.defaultSlot">
          <span v-html="item.defaultSlot"></span>
        </template>
      </Badge>
    </div>
  `,
});

export const Small = Template.bind({}) as unknown as { args: Args };
Small.args = colors.map((e) => ({
  size: "sm",
  color: e,
  defaultSlot: e,
}));

export const SmallWithIcon = Template.bind({}) as unknown as { args: Args };
SmallWithIcon.args = colors.map((e) => ({
  size: "sm",
  color: e,
  defaultSlot: e,
  icon: ClipboardCheckIcon,
}));

export const SmallWithDot = Template.bind({}) as unknown as { args: Args };
SmallWithDot.args = colors.map((e) => ({
  size: "sm",
  color: e,
  defaultSlot: e,
  showDot: true,
}));

export const Medium = Template.bind({}) as unknown as { args: Args };
Medium.args = colors.map((e) => ({
  size: "md",
  color: e,
  defaultSlot: e,
}));

export const MediumWithIcon = Template.bind({}) as unknown as { args: Args };
MediumWithIcon.args = colors.map((e) => ({
  size: "md",
  color: e,
  defaultSlot: e,
  icon: ClipboardCheckIcon,
}));

export const MediumWithDot = Template.bind({}) as unknown as { args: Args };
MediumWithDot.args = colors.map((e) => ({
  size: "md",
  color: e,
  defaultSlot: e,
  showDot: true,
}));

export const WithTooltip = Template.bind({}) as unknown as { args: Args };
WithTooltip.args = colors.map((e) => ({
  size: "md",
  color: e,
  defaultSlot: e,
  tooltip: `This is a ${e} badge with a tooltip`,
}));
