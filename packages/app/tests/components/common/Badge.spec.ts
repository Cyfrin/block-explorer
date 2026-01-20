import { describe, expect, it } from "vitest";

import { render } from "@testing-library/vue";

import Badge from "@/components/common/Badge.vue";

import $testId from "@/plugins/testId";

describe("Badge", () => {
  const global = {
    plugins: [$testId],
  };
  it("renders default and icon slot", async () => {
    const { findByText, unmount } = render(Badge, {
      global,
      slots: {
        default: "Test slot content",
      },
    });
    await findByText("Test slot content");
    unmount();
  });
  it("renders icon slot content", async () => {
    const { findByText, container, unmount } = render(Badge, {
      global,
      slots: {
        icon: "Test icon slot content",
      },
    });
    await findByText("Test icon slot content");
    expect(container.querySelector(".badge-icon")).toBeTruthy();
    unmount();
  });
  it("properly uses size props", async () => {
    const { getByTestId, rerender, unmount } = render(Badge, { global });
    expect(getByTestId("badge")?.classList.contains("badge-sm")).toBe(true);
    await rerender({
      size: "md",
    });
    expect(getByTestId("badge")?.classList.contains("badge-md")).toBe(true);
    unmount();
  });
  it("properly uses color props", async () => {
    const { getByTestId, rerender, unmount } = render(Badge, { global });
    expect(getByTestId("badge")?.classList.contains("badge-neutral")).toBe(true);
    await rerender({ color: "success" });
    expect(getByTestId("badge")?.classList.contains("badge-success")).toBe(true);
    unmount();
  });
  it("renders dot when showDot is true", async () => {
    const { container, unmount } = render(Badge, {
      global,
      props: {
        showDot: true,
      },
    });
    expect(container.querySelector(".badge-dot")).toBeTruthy();
    unmount();
  });
  it("shows tooltip on hover", async () => {
    const { findByText, unmount } = render(Badge, {
      global,
      props: {
        tooltip: "Test tooltip text",
      },
    });
    await findByText("Test tooltip text");
    unmount();
  });
});
