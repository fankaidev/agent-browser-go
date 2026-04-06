#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export function normalizeUrl(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

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

function printUsage() {
  console.log("Usage:");
  console.log("  abg <url>              Opens URL and prints page title");
  console.log("  abg <site> <script>    Runs sites/<site>/<script>.js");
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
  exec(`agent-browser open ${getOpenArgs()} '${url}'`);
  exec("agent-browser wait --load networkidle");
  const result = exec(`agent-browser eval '${parsed.body.replace(/'/g, "'\\''")}'`);
  console.log(result);
}

function exec(command: string): string {
  return execSync(command, { encoding: "utf-8" }).trim();
}

function main() {
  const args = process.argv.slice(2);

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

  exec(`agent-browser open ${getOpenArgs()} '${fullUrl}'`);
  exec("agent-browser wait --load networkidle");
  const title = exec("agent-browser eval 'document.title'");

  console.log(title);
}

// Only run main when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
