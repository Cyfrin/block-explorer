<template>
  <Popover class="header">
    <div class="header-inner">
      <div class="header-container container">
        <!-- Logo -->
        <div class="header-logo">
          <router-link :to="{ name: 'home' }" class="logo-link">
            <img :src="LogomarkColorDark" class="logo-image logo-light" alt="BattleChain" />
            <img :src="LogomarkColor" class="logo-image logo-dark" alt="BattleChain" />
          </router-link>
        </div>

        <!-- Spacer to push controls to the right -->
        <div class="header-spacer" />

        <!-- Right side controls (nav + network + theme) -->
        <div class="header-controls">
          <!-- Desktop Navigation -->
          <PopoverGroup as="nav" class="header-nav">
            <LinksPopover :label="t('header.nav.blockExplorer')" :items="blockExplorerLinks" />
            <LinksPopover :label="t('header.nav.tools')" :items="toolsLinks" />
            <a
              v-for="item in navigation"
              :key="item.label"
              :href="item.url"
              target="_blank"
              rel="noopener"
              class="nav-link"
            >
              {{ item.label }}
            </a>
          </PopoverGroup>
          <WalletButton v-if="runtimeConfig.appEnvironment === 'prividium'" />
          <NetworkSwitch v-else />
          <ThemeToggle />
          <div v-if="socials.length" class="header-socials">
            <a
              v-for="(social, index) in socials"
              :key="index"
              :href="social.url"
              target="_blank"
              rel="noopener"
              class="social-link"
            >
              <component :is="social.component" />
            </a>
          </div>
        </div>

        <!-- Mobile menu button -->
        <div class="header-mobile-toggle">
          <PopoverButton class="mobile-menu-btn">
            <span class="sr-only">Open menu</span>
            <MenuIcon class="menu-icon" aria-hidden="true" />
          </PopoverButton>
        </div>
      </div>
    </div>

    <!-- Mobile menu panel -->
    <transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-transform duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <PopoverPanel focus class="mobile-menu">
        <div class="mobile-menu-inner">
          <div class="mobile-menu-header">
            <div class="mobile-logo">
              <img :src="LogoColor" class="logo-icon" alt="BattleChain" />
            </div>
            <PopoverButton class="mobile-close-btn">
              <span class="sr-only">Close menu</span>
              <XIcon class="close-icon" aria-hidden="true" />
            </PopoverButton>
          </div>

          <nav class="mobile-nav">
            <LinksMobilePopover :items="blockExplorerLinks" />
            <div class="mobile-nav-divider" />
            <LinksMobilePopover :items="toolsLinks" />
            <div class="mobile-nav-divider" />
            <div class="mobile-nav-links">
              <a
                v-for="item in navigation"
                :key="item.label"
                :href="item.url"
                target="_blank"
                rel="noopener"
                class="mobile-nav-link"
              >
                {{ item.label }}
              </a>
            </div>
          </nav>

          <div class="mobile-controls">
            <WalletButton v-if="runtimeConfig.appEnvironment === 'prividium'" />
            <NetworkSwitch v-else />
            <ThemeToggle />
          </div>

          <div class="mobile-socials">
            <a
              v-for="(social, index) in socials"
              :key="index"
              :href="social.url"
              target="_blank"
              rel="noopener"
              class="social-link"
            >
              <component :is="social.component" />
            </a>
          </div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>

<script lang="ts" setup>
import { computed, reactive } from "vue";
import { useI18n } from "vue-i18n";

import { Popover, PopoverButton, PopoverGroup, PopoverPanel } from "@headlessui/vue";
import { MenuIcon, XIcon } from "@heroicons/vue/outline";

import LinksMobilePopover from "./LinksMobilePopover.vue";
import LinksPopover from "./LinksPopover.vue";
import WalletButton from "../prividium/WalletButton.vue";

import NetworkSwitch from "@/components/NetworkSwitch.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";

import useContext from "@/composables/useContext";
import useRuntimeConfig from "@/composables/useRuntimeConfig";

import type DiscordIcon from "@/components/icons/DiscordIcon.vue";
import type TwitterIcon from "@/components/icons/TwitterIcon.vue";

import LogoColor from "@/assets/Logo-color.svg";
import LogomarkColorDark from "@/assets/Logomark-color-dark.svg";
import LogomarkColor from "@/assets/Logomark-color.svg";

const { t } = useI18n({ useScope: "global" });
const { currentNetwork } = useContext();
const runtimeConfig = useRuntimeConfig();

const navigation = reactive([
  // TODO: Update to BattleChain documentation URL when available
  // {
  //   label: computed(() => t("header.nav.documentation")),
  //   url: "https://docs.battlechain.io",
  // },
]);

const blockExplorerLinks = reactive([
  {
    label: computed(() => t("blocksView.title")),
    to: { name: "blocks" },
  },
  {
    label: computed(() => t("transactionsView.title")),
    to: { name: "transactions" },
  },
  {
    label: computed(() => t("tokensView.title")),
    to: { name: "tokens" },
  },
  {
    label: computed(() => t("agreementsView.title")),
    to: { name: "agreements" },
  },
]);

const links = [
  {
    label: computed(() => t("header.nav.apiDocs")),
    url: computed(() => `${currentNetwork.value.apiUrl}/docs`),
  },
  {
    label: computed(() => t("header.nav.contractVerification")),
    to: { name: "contract-verification" },
  },
];

if (currentNetwork.value.bridgeUrl) {
  links.push({
    label: computed(() => t("header.nav.bridge")),
    url: computed(() => currentNetwork.value.bridgeUrl!),
  });
}

const toolsLinks = reactive(links);

// TODO: Update to BattleChain social URLs when available
const socials: { url: string; component: typeof DiscordIcon | typeof TwitterIcon }[] = [
  // { url: "https://discord.gg/battlechain", component: DiscordIcon },
  // { url: "https://x.com/battlechain", component: TwitterIcon },
];
</script>

<style lang="scss">
.header {
  @apply sticky top-0 z-50;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-default);
}

.header-inner {
  @apply w-full;
}

.header-container {
  @apply flex items-center justify-between h-14 gap-4 px-4 mx-auto;
  max-width: 1240px;
}

.header-logo {
  @apply shrink-0;

  .logo-link {
    @apply flex items-center no-underline;
  }

  .logo-image {
    height: 28px;
    width: auto;
  }
}

.header-spacer {
  @apply flex-1;
}

.header-nav {
  @apply hidden items-center gap-1 lg:flex;

  .nav-link {
    @apply flex items-center py-2 px-3 text-base font-medium no-underline rounded-md;
    color: var(--text-secondary);
    transition: all 100ms ease-out;

    &:hover {
      color: var(--text-primary);
      background-color: var(--bg-hover);
    }

    &.router-link-exact-active {
      color: var(--text-primary);
      background-color: var(--bg-tertiary);
    }
  }

  // Dropdown styles
  .dropdown-container {
    @apply relative;

    .navigation-link {
      @apply flex items-center py-2 px-3 text-base font-medium no-underline rounded-md;
      color: var(--text-secondary);
      transition: all 100ms ease-out;

      &:hover,
      &.active {
        color: var(--text-primary);
        background-color: var(--bg-hover);
      }

      .dropdown-icon {
        @apply w-4 h-4 ml-1;
        transition: transform 100ms ease-out;
      }

      &.active .dropdown-icon {
        @apply -rotate-180;
      }
    }

    .dropdown-items {
      @apply absolute left-0 top-full mt-1 min-w-[200px] p-2 rounded-lg;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-default);
      box-shadow: var(--shadow-lg);

      .dropdown-item {
        @apply block py-2 px-3 text-base no-underline rounded-md;
        color: var(--text-secondary);
        transition: all 100ms ease-out;

        &:hover {
          color: var(--text-primary);
          background-color: var(--bg-hover);
        }

        &.router-link-exact-active {
          color: var(--accent);
          background-color: var(--accent-muted);
        }
      }
    }
  }
}

.header-controls {
  @apply hidden items-center gap-3 lg:flex;
}

.header-socials {
  @apply flex items-center gap-2;
}

.social-link {
  @apply flex items-center justify-center w-9 h-9 rounded-md;
  color: var(--text-muted);
  transition: all 100ms ease-out;

  &:hover {
    color: var(--text-primary);
    background-color: var(--bg-hover);
  }

  svg {
    @apply w-5 h-5;
  }
}

.header-mobile-toggle {
  @apply flex lg:hidden;
}

.mobile-menu-btn {
  @apply flex items-center justify-center w-10 h-10 p-2 bg-transparent rounded-md cursor-pointer;
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
  transition: all 100ms ease-out;

  &:hover {
    color: var(--text-primary);
    background-color: var(--bg-hover);
  }

  .menu-icon {
    @apply w-6 h-6;
  }
}

// Mobile menu
.mobile-menu {
  @apply fixed inset-0 z-50 p-4 lg:hidden;
  background-color: var(--bg-primary);
}

.mobile-menu-inner {
  @apply flex flex-col h-full;
}

.mobile-menu-header {
  @apply flex items-center justify-between pb-4;
  border-bottom: 1px solid var(--border-default);
}

.mobile-logo {
  .logo-icon {
    height: 32px;
    width: auto;
  }
}

.mobile-close-btn {
  @apply flex items-center justify-center w-10 h-10 p-2 bg-transparent border-none rounded-md cursor-pointer;
  color: var(--text-secondary);
  transition: all 100ms ease-out;

  &:hover {
    color: var(--text-primary);
    background-color: var(--bg-hover);
  }

  .close-icon {
    @apply w-6 h-6;
  }
}

.mobile-nav {
  @apply flex-1 py-4 overflow-y-auto;
}

.mobile-nav-divider {
  @apply h-px my-3;
  background-color: var(--border-default);
}

.mobile-nav-links {
  @apply flex flex-col gap-1;
}

.mobile-nav-link {
  @apply flex items-center p-3 text-base font-medium no-underline rounded-md;
  color: var(--text-secondary);
  transition: all 100ms ease-out;

  &:hover {
    color: var(--text-primary);
    background-color: var(--bg-hover);
  }

  &.router-link-exact-active {
    color: var(--accent);
    background-color: var(--accent-muted);
  }
}

.mobile-controls {
  @apply flex flex-wrap gap-3 py-4;
  border-top: 1px solid var(--border-default);
}

// Theme-aware logo visibility
.logo-light {
  display: block;

  [data-theme="dark"] & {
    display: none;
  }
}

.logo-dark {
  display: none;

  [data-theme="dark"] & {
    display: block;
  }
}

.mobile-socials {
  @apply flex justify-center gap-3 pt-4;
  border-top: 1px solid var(--border-default);

  .social-link {
    svg {
      path {
        fill: var(--accent);
      }
    }
  }
}
</style>
