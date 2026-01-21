import { describe, expect, it } from "vitest";

import { render } from "@testing-library/vue";

import ContractNotRegistered from "@/components/contract/ContractNotRegistered.vue";

describe("ContractNotRegistered", () => {
  it("renders warning message", () => {
    const { container } = render(ContractNotRegistered);

    expect(container.textContent).toContain("Not Registered");
    expect(container.textContent).toContain("not registered in the AttackRegistry");
  });

  it("renders warning about interaction risks", () => {
    const { container } = render(ContractNotRegistered);

    expect(container.textContent).toContain("Consider this when deciding");
  });

  it("applies warning styling class", () => {
    const { container } = render(ContractNotRegistered);

    expect(container.querySelector(".contract-not-registered")).toBeTruthy();
  });

  it("renders warning icon", () => {
    const { container } = render(ContractNotRegistered);

    expect(container.querySelector(".icon")).toBeTruthy();
  });
});
