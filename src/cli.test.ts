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
  it("extracts domain from frontmatter", () => {
    const content = `/*
domain: reddit.com
*/
Array.from(document.querySelectorAll('h1'))`;
    const result = parseFrontmatter(content);
    expect(result).toEqual({
      domain: "reddit.com",
      body: "Array.from(document.querySelectorAll('h1'))",
    });
  });

  it("throws on missing frontmatter", () => {
    const content = `Array.from(document.querySelectorAll('h1'))`;
    expect(() => parseFrontmatter(content)).toThrow("Invalid frontmatter format");
  });

  it("throws on missing domain", () => {
    const content = `/*
name: test
*/
body`;
    expect(() => parseFrontmatter(content)).toThrow("Missing domain in frontmatter");
  });
});
