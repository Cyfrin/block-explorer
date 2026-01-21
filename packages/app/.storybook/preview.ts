import "../src/assets/tailwind.css";
import { createI18n } from "vue-i18n";
import enUS from "../src/locales/en.json";
import { setup } from "@storybook/vue3";
import $testId from "../src/plugins/testId";
import type { Preview } from "@storybook/vue3";

setup((app) => {
  app.component("RouterLink", {
    template: `<a v-bind="$props" href="#"><slot /></a>`,
  });

  const i18n = createI18n({
    locale: "en",
    allowComposition: true,
    messages: {
      en: enUS,
    },
  });

  app.use(i18n);
  app.use($testId);
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
