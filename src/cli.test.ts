import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./cli.js";

describe("normalizeUrl", () => {
  it("adds https:// to bare domain", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
  });

  it("keeps https:// url unchanged", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("keeps http:// url unchanged", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("handles domain with path", () => {
    expect(normalizeUrl("example.com/path")).toBe("https://example.com/path");
  });
});
