import { vi } from "vitest";

// Global vue-router mock providing defaults for all tests.
// Individual test files can override with their own vi.mock("vue-router", ...).
vi.mock("vue-router", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import("vue-router")>();
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      resolve: vi.fn(() => ({ href: "/" })),
      currentRoute: { value: { query: {} } },
    }),
    useRoute: () => ({
      query: {},
      params: {},
      name: "",
      path: "/",
      matched: [],
    }),
  };
});
