#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export function parseFrontmatter(content: string): { domain: string; body: string } {
  const match = content.match(/^\/\*\n([\s\S]*?)\n\*\/\n([\s\S]*)$/);
  if (!match) {
    throw new Error("Invalid frontmatter format");
  }
  const [, frontmatter, body] = match;
  const domainMatch = frontmatter!.match(/^domain:\s*(.+)$/m);
  if (!domainMatch) {
    throw new Error("Missing domain in frontmatter");
  }
  return { domain: domainMatch[1]!.trim(), body: body!.trim() };
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
  const usage = "Usage: abg <site> <action>";

  if (args.length === 0) {
    return { ok: false, error: "Missing site argument", usage };
  }

  if (args.length === 1) {
    const site = args[0]!;
    const dir = sitesDir ?? getSitesDir();
    const actions = getAvailableActions(dir, site);
    return { ok: false, error: "Missing action argument", usage, actions };
  }

  return { ok: true, site: args[0]!, action: args[1]! };
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

function getProfilePath(): string | null {
  const profilePath = join(homedir(), ".abg", "profile");
  return existsSync(profilePath) ? profilePath : null;
}

function getOpenArgs(): string {
  const profilePath = getProfilePath();
  const args = ["--headed"];
  if (profilePath) {
    args.push(`--profile '${profilePath}'`);
  }
  return args.join(" ");
}

function runScript(site: string, script: string): void {
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
  let parsed: { domain: string; body: string };
  try {
    parsed = parseFrontmatter(content);
  } catch {
    console.error(`Missing domain in ${scriptPath}`);
    process.exit(1);
  }

  const url = `https://${parsed.domain}`;
  ab(`open ${getOpenArgs()} '${url}'`);
  ab("wait --load networkidle");
  const result = ab(`eval --json '${parsed.body.replace(/'/g, "'\\''")}'`);
  console.log(result);
}

const WAIT_TIMEOUT = 60000;
const AB_SESSION = "abg";

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

  runScript(validation.site, validation.action);
}

// Only run main when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
