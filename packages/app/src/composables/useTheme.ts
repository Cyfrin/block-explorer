import { onMounted, ref, watch } from "vue";

export type Theme = "light" | "dark" | "system";

const THEME_KEY = "block-explorer-theme";

// Get system preference
function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Get stored theme or default to system
function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

// Apply theme to document
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const effectiveTheme = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.dataset.theme = effectiveTheme;
}

// Shared state across components
const theme = ref<Theme>(getStoredTheme());

export function useTheme() {
  // Apply theme on mount
  onMounted(() => {
    applyTheme(theme.value);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme.value === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
  });

  // Watch for theme changes
  watch(theme, (newTheme) => {
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);
  });

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;
  };

  const toggleTheme = () => {
    // Cycle through: light -> dark -> system -> light
    if (theme.value === "light") {
      theme.value = "dark";
    } else if (theme.value === "dark") {
      theme.value = "system";
    } else {
      theme.value = "light";
    }
  };

  const isDark = () => {
    const effectiveTheme = theme.value === "system" ? getSystemTheme() : theme.value;
    return effectiveTheme === "dark";
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
  };
}
