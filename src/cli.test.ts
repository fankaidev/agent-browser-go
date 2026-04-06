import { describe, expect, it } from "vitest";
import { normalizeUrl, parseFrontmatter } from "./cli.js";

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

describe("parseFrontmatter", () => {
  it("parses api type with url", () => {
    const content = `/*
type: api
url: https://example.com/api
*/`;
    const result = parseFrontmatter(content);
    expect(result).toEqual({
      type: "api",
      url: "https://example.com/api",
      domain: undefined,
      body: "",
    });
  });

  it("parses fetch type with url and domain", () => {
    const content = `/*
type: fetch
url: https://example.com/api
domain: example.com
*/`;
    const result = parseFrontmatter(content);
    expect(result).toEqual({
      type: "fetch",
      url: "https://example.com/api",
      domain: "example.com",
      body: "",
    });
  });

  it("parses scrape type with domain and body", () => {
    const content = `/*
type: scrape
domain: example.com
*/
document.title`;
    const result = parseFrontmatter(content);
    expect(result).toEqual({
      type: "scrape",
      url: undefined,
      domain: "example.com",
      body: "document.title",
    });
  });

  it("throws on missing frontmatter", () => {
    const content = `document.title`;
    expect(() => parseFrontmatter(content)).toThrow("Invalid frontmatter format");
  });

  it("throws on missing type", () => {
    const content = `/*
url: https://example.com
*/`;
    expect(() => parseFrontmatter(content)).toThrow("Missing or invalid type");
  });

  it("throws on invalid type", () => {
    const content = `/*
type: invalid
*/`;
    expect(() => parseFrontmatter(content)).toThrow("Missing or invalid type");
  });
});
