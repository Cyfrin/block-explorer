import { describe, expect, it } from "vitest";

import { render } from "@testing-library/vue";

import Button from "@/components/common/Button.vue";

describe("Button:", () => {
  it("applies custom variant and size (class properties)", () => {
    const { container } = render(Button, {
      props: {
        variant: "secondary",
        size: "md",
      },
    });

    const element = container.querySelector(".btn")!;
    expect(element.classList.contains("btn-secondary")).toBe(true);
    expect(element.classList.contains("btn-md")).toBe(true);
  });
  it("uses custom tag", () => {
    const { container } = render(Button, {
      props: {
        tag: "a",
      },
    });

    expect(container.querySelector("a.btn")).not.toBeNull();
  });
  it("loading is visible", () => {
    const { container } = render(Button, {
      props: {
        loading: true,
      },
    });

    expect(container.querySelector(".btn-spinner")).not.toBeNull();
  });
  it("renders default slot", () => {
    const { container } = render(Button, {
      slots: {
        default: "Hello",
      },
    });

    expect(container.querySelector(".btn")?.textContent).toBe("Hello");
  });
});
