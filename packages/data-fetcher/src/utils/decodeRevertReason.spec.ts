import { decodeRevertReason } from "./decodeRevertReason";

describe("decodeRevertReason", () => {
  it("returns null for null output", () => {
    expect(decodeRevertReason(null)).toBeNull();
  });

  it("returns null for empty 0x output", () => {
    expect(decodeRevertReason("0x")).toBeNull();
  });

  it("returns null for output too short to contain a selector", () => {
    expect(decodeRevertReason("0x1234")).toBeNull();
  });

  it("decodes Error(string) revert reason", () => {
    // Error(string) selector 0x08c379a0 + abi-encoded "Insufficient balance"
    const output =
      "0x08c379a0" +
      "00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000014496e73756666696369656e742062616c616e6365000000000000000000000000";
    expect(decodeRevertReason(output)).toBe("Insufficient balance");
  });

  it("decodes Panic(uint256) with arithmetic overflow code", () => {
    // Panic(uint256) selector 0x4e487b71 + abi-encoded 0x11
    const output = "0x4e487b71" + "0000000000000000000000000000000000000000000000000000000000000011";
    expect(decodeRevertReason(output)).toBe("Panic(0x11): Arithmetic overflow/underflow");
  });

  it("decodes Panic(uint256) with assertion failed code", () => {
    const output = "0x4e487b71" + "0000000000000000000000000000000000000000000000000000000000000001";
    expect(decodeRevertReason(output)).toBe("Panic(0x01): Assertion failed");
  });

  it("decodes Panic(uint256) with division by zero code", () => {
    const output = "0x4e487b71" + "0000000000000000000000000000000000000000000000000000000000000012";
    expect(decodeRevertReason(output)).toBe("Panic(0x12): Division or modulo by zero");
  });

  it("decodes Panic(uint256) with unknown code", () => {
    const output = "0x4e487b71" + "00000000000000000000000000000000000000000000000000000000000000ff";
    expect(decodeRevertReason(output)).toBe("Panic(0xff): Unknown panic code");
  });

  it("returns raw hex for unknown error selector", () => {
    // Custom error selector 0x7eab4bc4 (AttackRegistry__InvalidState)
    const output = "0x7eab4bc4" + "0000000000000000000000000000000000000000000000000000000000000000";
    expect(decodeRevertReason(output)).toBe(output);
  });

  it("returns raw hex when Error(string) data is malformed", () => {
    const output = "0x08c379a0" + "deadbeef";
    expect(decodeRevertReason(output)).toBe(output);
  });
});
