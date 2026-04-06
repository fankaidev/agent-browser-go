#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export function normalizeUrl(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

export interface ScriptConfig {
  type: "api" | "fetch" | "scrape";
  url: string | undefined;
  domain: string | undefined;
  body: string;
}

export function parseFrontmatter(content: string): ScriptConfig {
  const match = content.match(/^\/\*\n([\s\S]*?)\n\*\/\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Invalid frontmatter format");
  }
  const [, frontmatter, body] = match;

  const typeMatch = frontmatter!.match(/^type:\s*(.+)$/m);
  const urlMatch = frontmatter!.match(/^url:\s*(.+)$/m);
  const domainMatch = frontmatter!.match(/^domain:\s*(.+)$/m);

  const type = typeMatch?.[1]?.trim() as ScriptConfig["type"] | undefined;
  if (!type || !["api", "fetch", "scrape"].includes(type)) {
    throw new Error("Missing or invalid type in frontmatter");
  }

  if (type === "api" && !urlMatch) {
    throw new Error("api type requires url");
  }
  if (type === "fetch") {
    if (!urlMatch) throw new Error("fetch type requires url");
    if (!domainMatch) throw new Error("fetch type requires domain");
  }
  if (type === "scrape" && !domainMatch) {
    throw new Error("scrape type requires domain");
  }

  return {
    type,
    url: urlMatch?.[1]?.trim(),
    domain: domainMatch?.[1]?.trim(),
    body: body!.trim(),
  };
}

let debug = false;

function printUsage() {
  console.log("Usage:");
  console.log("  abg [--debug] <url>              Opens URL and prints page title");
  console.log("  abg [--debug] <site> <script>    Runs sites/<site>/<script>.js");
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
  let config: ScriptConfig;
  try {
    config = parseFrontmatter(content);
  } catch (e) {
    console.error(`Invalid script format in ${scriptPath}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  switch (config.type) {
    case "api":
      runApi(config.url!);
      break;
    case "fetch":
      runFetch(config.domain!, config.url!);
      break;
    case "scrape":
      runScrape(config.domain!, config.body);
      break;
  }
}

const WAIT_TIMEOUT = 60000;
const AB_SESSION = "abg";

function ab(subcommand: string): string {
  return exec(`agent-browser --session ${AB_SESSION} ${subcommand}`);
}

function runApi(url: string): void {
  const result = execSync(`curl -s '${url}'`, { encoding: "utf-8" }).trim();
  console.log(result);
}

function runFetch(domain: string, url: string): void {
  const pageUrl = `https://${domain}`;
  ab(`open ${getOpenArgs()} '${pageUrl}'`);
  ab("wait --load networkidle");
  const fetchCode = `fetch('${url}').then(r => r.json())`;
  const result = ab(`eval --json '${fetchCode}'`);
  console.log(result);
}

function runScrape(domain: string, body: string): void {
  const url = `https://${domain}`;
  ab(`open ${getOpenArgs()} '${url}'`);
  ab("wait --load networkidle");
  const result = ab(`eval --json '${body.replace(/'/g, "'\\''")}'`);
  console.log(result);
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

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  if (args.length === 2) {
    runScript(args[0]!, args[1]!);
    return;
  }

  const url = args[0]!;
  const fullUrl = normalizeUrl(url);

  ab(`open ${getOpenArgs()} '${fullUrl}'`);
  ab("wait --load networkidle");
  const title = ab("eval 'document.title'");

  console.log(JSON.stringify({ title }));
}

// Only run main when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
