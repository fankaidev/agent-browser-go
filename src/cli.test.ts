import { describe, expect, it } from "vitest";
import { parseArgDefs, parseCliArgs, parseFrontmatter, validateArgs } from "./cli.js";

describe("parseFrontmatter", () => {
  it("parses api type with body", () => {
    const content = `/*
type: api
*/
fetch("https://example.com").then(r => r.json())`;
    const result = parseFrontmatter(content);
    expect(result).toEqual({
      type: "api",
      domain: undefined,
      args: undefined,
      body: 'fetch("https://example.com").then(r => r.json())',
    });
  });

  it("parses api type with args", () => {
    const content = `/*
type: api
args: limit=10, id
*/
fetch(url).then(r => r.json())`;
    const result = parseFrontmatter(content);
    expect(result).toEqual({
      type: "api",
      domain: undefined,
      args: "limit=10, id",
      body: "fetch(url).then(r => r.json())",
    });
  });

  it("parses fetch type with domain", () => {
    const content = `/*
type: fetch
domain: reddit.com
*/
fetch("https://reddit.com/api").then(r => r.json())`;
    const result = parseFrontmatter(content);
    expect(result).toEqual({
      type: "fetch",
      domain: "reddit.com",
      args: undefined,
      body: 'fetch("https://reddit.com/api").then(r => r.json())',
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
      domain: "example.com",
      args: undefined,
      body: "document.title",
    });
  });

  it("throws on missing frontmatter", () => {
    const content = `document.title`;
    expect(() => parseFrontmatter(content)).toThrow("Invalid frontmatter format");
  });

  it("throws on missing type", () => {
    const content = `/*
domain: example.com
*/
body`;
    expect(() => parseFrontmatter(content)).toThrow("Missing or invalid type");
  });

  it("throws on invalid type", () => {
    const content = `/*
type: invalid
*/
body`;
    expect(() => parseFrontmatter(content)).toThrow("Missing or invalid type");
  });

  it("throws when api type missing body", () => {
    const content = `/*
type: api
*/`;
    expect(() => parseFrontmatter(content)).toThrow("api type requires body");
  });

  it("throws when fetch type missing domain", () => {
    const content = `/*
type: fetch
*/
fetch(url)`;
    expect(() => parseFrontmatter(content)).toThrow("fetch type requires domain");
  });

  it("throws when scrape type missing domain", () => {
    const content = `/*
type: scrape
*/
document.title`;
    expect(() => parseFrontmatter(content)).toThrow("scrape type requires domain");
  });
});

describe("parseArgDefs", () => {
  it("parses optional arg with default", () => {
    const result = parseArgDefs("limit=10");
    expect(result).toEqual([{ name: "limit", required: false, defaultValue: "10" }]);
  });

  it("parses required arg without default", () => {
    const result = parseArgDefs("id");
    expect(result).toEqual([{ name: "id", required: true, defaultValue: undefined }]);
  });

  it("parses multiple args", () => {
    const result = parseArgDefs("limit=10, id");
    expect(result).toEqual([
      { name: "limit", required: false, defaultValue: "10" },
      { name: "id", required: true, defaultValue: undefined },
    ]);
  });

  it("returns empty array for empty string", () => {
    const result = parseArgDefs("");
    expect(result).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    const result = parseArgDefs(undefined);
    expect(result).toEqual([]);
  });
});

describe("parseCliArgs", () => {
  it("parses --key=value args", () => {
    const result = parseCliArgs(["--id=123", "--limit=10"]);
    expect(result).toEqual({ id: "123", limit: "10" });
  });

  it("ignores non --key=value args", () => {
    const result = parseCliArgs(["foo", "--id=123", "bar"]);
    expect(result).toEqual({ id: "123" });
  });

  it("returns empty object for empty array", () => {
    const result = parseCliArgs([]);
    expect(result).toEqual({});
  });
});

describe("validateArgs", () => {
  const usage = "Usage: abg <site> <action> [--arg=value ...]";

  it("returns error when no arguments provided", () => {
    const result = validateArgs([]);
    expect(result).toEqual({
      ok: false,
      error: "Missing site argument",
      usage,
    });
  });

  it("returns error with available actions when action is missing", () => {
    const result = validateArgs(["reddit"]);
    expect(result).toEqual({
      ok: false,
      error: "Missing action argument",
      usage,
      actions: ["best", "user"],
    });
  });

  it("returns error with empty actions for unknown site", () => {
    const result = validateArgs(["unknown"]);
    expect(result).toEqual({
      ok: false,
      error: "Missing action argument",
      usage,
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

  it("ignores --key=value args for validation", () => {
    const result = validateArgs(["hn", "top", "--limit=5"]);
    expect(result).toEqual({
      ok: true,
      site: "hn",
      action: "top",
    });
  });
});
