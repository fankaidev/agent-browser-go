#!/usr/bin/env node
import { execSync } from "child_process";
import { fileURLToPath } from "url";

export function normalizeUrl(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

function printUsage() {
  console.log("Usage: abg <url>");
  console.log("");
  console.log("Opens the URL and prints the page title.");
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

  const url = args[0]!;
  const fullUrl = normalizeUrl(url);

  exec(`agent-browser open '${fullUrl}'`);
  exec("agent-browser wait --load networkidle");
  const title = exec("agent-browser eval 'document.title'");

  console.log(title);
}

// Only run main when executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
