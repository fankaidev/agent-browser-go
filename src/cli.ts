#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export interface ScriptConfig {
  type: "api" | "fetch" | "scrape";
  domain: string | undefined;
  args: string | undefined;
  body: string;
}

export interface ArgDef {
  name: string;
  required: boolean;
  defaultValue: string | undefined;
}

export function parseArgDefs(argsStr: string | undefined): ArgDef[] {
  if (!argsStr || !argsStr.trim()) return [];
  return argsStr.split(",").map((arg) => {
    const trimmed = arg.trim();
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      return { name: trimmed, required: true, defaultValue: undefined };
    }
    return {
      name: trimmed.slice(0, eqIndex),
      required: false,
      defaultValue: trimmed.slice(eqIndex + 1),
    };
  });
}

export function parseCliArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const arg of args) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      result[match[1]!] = match[2]!;
    }
  }
  return result;
}

export function parseFrontmatter(content: string): ScriptConfig {
  const match = content.match(/^\/\*\n([\s\S]*?)\n\*\/\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Invalid frontmatter format");
  }
  const [, frontmatter, body] = match;

  const typeMatch = frontmatter!.match(/^type:\s*(.+)$/m);
  const domainMatch = frontmatter!.match(/^domain:\s*(.+)$/m);
  const argsMatch = frontmatter!.match(/^args:\s*(.+)$/m);

  const type = typeMatch?.[1]?.trim() as ScriptConfig["type"] | undefined;
  if (!type || !["api", "fetch", "scrape"].includes(type)) {
    throw new Error("Missing or invalid type in frontmatter");
  }

  const hasBody = body!.trim().length > 0;

  if (type === "api" && !hasBody) {
    throw new Error("api type requires body");
  }
  if (type === "fetch" && !domainMatch) {
    throw new Error("fetch type requires domain");
  }
  if (type === "scrape" && !domainMatch) {
    throw new Error("scrape type requires domain");
  }

  return {
    type,
    domain: domainMatch?.[1]?.trim(),
    args: argsMatch?.[1]?.trim(),
    body: body!.trim(),
  };
}

export type ValidateResult =
  | { ok: true; site: string; action: string }
  | { ok: false; error: string; usage: string; actions?: string[] };

export function getAvailableActions(sitesDir: string, site: string): string[] {
  const siteDir = join(sitesDir, site);
  if (!existsSync(siteDir)) {
    return [];
  }
  const files = readdirSync(siteDir);
  return files.filter((f) => f.endsWith(".js")).map((f) => f.replace(/\.js$/, ""));
}

export function validateArgs(args: string[], sitesDir?: string): ValidateResult {
  const usage = "Usage: abg <site> <action> [--arg=value ...]";

  // Filter out --key=value args
  const positional = args.filter((a) => !a.startsWith("--"));

  if (positional.length === 0) {
    return { ok: false, error: "Missing site argument", usage };
  }

  if (positional.length === 1) {
    const site = positional[0]!;
    const dir = sitesDir ?? getSitesDir();
    const actions = getAvailableActions(dir, site);
    return { ok: false, error: "Missing action argument", usage, actions };
  }

  return { ok: true, site: positional[0]!, action: positional[1]! };
}

let debug = false;

function printUsage() {
  console.log("Usage: abg [--debug] <site> <action>");
  console.log("");
  console.log("Options:");
  console.log("  --debug    Print agent-browser commands before executing");
}

function getSitesDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "sites");
}

function getOpenArgs(): string {
  return isSessionRunning() ? "" : "--headed";
}

function resolveArgs(
  argDefs: ArgDef[],
  cliArgs: Record<string, string>,
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const def of argDefs) {
    const value = cliArgs[def.name] ?? def.defaultValue;
    if (value === undefined) {
      throw new Error(`Missing required argument: --${def.name}`);
    }
    // Convert to number if it looks like one
    result[def.name] = /^\d+$/.test(value) ? Number(value) : value;
  }
  return result;
}

async function runApi(body: string, args: Record<string, string | number>): Promise<void> {
  const varDecls = Object.entries(args)
    .map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`)
    .join("\n");
  const code = `${varDecls}\n${body}`;

  try {
    // eslint-disable-next-line no-eval
    const result = await eval(code);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`Script error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

function runFetch(domain: string, body: string, args: Record<string, string | number>): void {
  const varDecls = Object.entries(args)
    .map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`)
    .join("\n");
  const code = `${varDecls}\n${body}`;

  const pageUrl = `https://${domain}`;
  ab(`open ${getOpenArgs()} '${pageUrl}'`);
  ab("wait --load load");
  const result = ab(`eval --json '${code.replace(/'/g, "'\\''")}'`);
  console.log(result);
}

function runScrape(domain: string, body: string, args: Record<string, string | number>): void {
  const varDecls = Object.entries(args)
    .map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`)
    .join("\n");
  const code = `${varDecls}\n${body}`;

  const url = `https://${domain}`;
  ab(`open ${getOpenArgs()} '${url}'`);
  ab("wait --load networkidle");
  const result = ab(`eval --json '${code.replace(/'/g, "'\\''")}'`);
  console.log(result);
}

function runScript(site: string, script: string, cliArgs: Record<string, string>): void {
  const sitesDir = getSitesDir();
  const siteDir = join(sitesDir, site);

  if (!existsSync(siteDir)) {
    console.error(`Site not found: ${site}`);
    process.exit(1);
  }

  const scriptPath = join(siteDir, `${script}.js`);
  if (!existsSync(scriptPath)) {
    console.error(`Script not found: ${site}/${script}`);
    process.exit(1);
  }

  const content = readFileSync(scriptPath, "utf-8");
  let config: ScriptConfig;
  try {
    config = parseFrontmatter(content);
  } catch (e) {
    console.error(`Invalid script format in ${scriptPath}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  const argDefs = parseArgDefs(config.args);
  let resolvedArgs: Record<string, string | number>;
  try {
    resolvedArgs = resolveArgs(argDefs, cliArgs);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  switch (config.type) {
    case "api":
      runApi(config.body, resolvedArgs);
      break;
    case "fetch":
      runFetch(config.domain!, config.body, resolvedArgs);
      break;
    case "scrape":
      runScrape(config.domain!, config.body, resolvedArgs);
      break;
  }
}

const WAIT_TIMEOUT = 60000;
const AB_SESSION = "abg";

function isSessionRunning(): boolean {
  try {
    const output = execSync("agent-browser session list", { encoding: "utf-8" });
    return output.includes(AB_SESSION);
  } catch {
    return false;
  }
}

function ab(subcommand: string): string {
  return exec(`agent-browser --session ${AB_SESSION} ${subcommand}`);
}

function exec(command: string): string {
  if (debug) {
    console.error(`> ${command}`);
  }
  return execSync(command, {
    encoding: "utf-8",
    env: { ...process.env, AGENT_BROWSER_DEFAULT_TIMEOUT: String(WAIT_TIMEOUT) },
  }).trim();
}

function main() {
  let args = process.argv.slice(2);

  if (args[0] === "--debug") {
    debug = true;
    args = args.slice(1);
  }

  if (args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  const validation = validateArgs(args);
  if (!validation.ok) {
    console.error(`Error: ${validation.error}`);
    console.error(validation.usage);
    if (validation.actions && validation.actions.length > 0) {
      console.error("");
      console.error(`Available actions for ${args[0]}:`);
      for (const action of validation.actions) {
        console.error(`  ${action}`);
      }
    }
    process.exit(1);
  }

  const scriptArgs = parseCliArgs(args);
  runScript(validation.site, validation.action, scriptArgs);
}

// Only run main when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
