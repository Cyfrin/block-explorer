import { describe, expect, it } from "vitest";

import { sanitizeHref } from "@/utils/validators";

describe("sanitizeHref", () => {
  it("allows https URLs", () => {
    expect(sanitizeHref("https://example.com")).toBe("https://example.com");
  });

  it("allows http URLs", () => {
    expect(sanitizeHref("http://example.com")).toBe("http://example.com");
  });

  it("allows mailto URLs", () => {
    expect(sanitizeHref("mailto:user@example.com")).toBe("mailto:user@example.com");
  });

  it("allows ipfs URLs", () => {
    expect(sanitizeHref("ipfs://QmHash123")).toBe("ipfs://QmHash123");
  });

  it("allows ar (arweave) URLs", () => {
    expect(sanitizeHref("ar://txid123")).toBe("ar://txid123");
  });

  it("preserves paths, query strings, and fragments", () => {
    const url = "https://example.com/path?q=1&b=2#section";
    expect(sanitizeHref(url)).toBe(url);
  });

  it("blocks javascript: scheme", () => {
    expect(sanitizeHref("javascript:alert(1)")).toBe("");
  });

  it("blocks mixed-case JaVaScRiPt: obfuscation", () => {
    expect(sanitizeHref("JaVaScRiPt:alert(1)")).toBe("");
  });

  it("blocks data: scheme", () => {
    expect(sanitizeHref("data:text/html,<script>alert(1)</script>")).toBe("");
  });

  it("blocks vbscript: scheme", () => {
    expect(sanitizeHref("vbscript:MsgBox('xss')")).toBe("");
  });

  it("blocks blob: scheme", () => {
    expect(sanitizeHref("blob:http://example.com/uuid")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeHref("")).toBe("");
  });

  it("returns empty string for unparseable input", () => {
    expect(sanitizeHref("not a url at all")).toBe("");
  });
});
