import { describe, expect, it } from "vitest";
import { parseFrontmatter, validateArgs } from "./cli.js";

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

describe("validateArgs", () => {
  it("returns error when no arguments provided", () => {
    const result = validateArgs([]);
    expect(result).toEqual({
      ok: false,
      error: "Missing site argument",
      usage: "Usage: abg <site> <action>",
    });
  });

  it("returns error with available actions when action is missing", () => {
    const result = validateArgs(["reddit"]);
    expect(result).toEqual({
      ok: false,
      error: "Missing action argument",
      usage: "Usage: abg <site> <action>",
      actions: ["best"],
    });
  });

  it("returns error with empty actions for unknown site", () => {
    const result = validateArgs(["unknown"]);
    expect(result).toEqual({
      ok: false,
      error: "Missing action argument",
      usage: "Usage: abg <site> <action>",
      actions: [],
    });
  });

  it("returns success when site and action provided", () => {
    const result = validateArgs(["reddit", "best"]);
    expect(result).toEqual({
      ok: true,
      site: "reddit",
      action: "best",
    });
  });
});
