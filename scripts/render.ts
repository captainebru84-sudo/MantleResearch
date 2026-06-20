import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderMarkdown } from "../src/report/render-md.js";
import type { FrictionReport } from "../src/types.js";

const examplesDir = resolve("examples");

function listJsonReports(): string[] {
  return readdirSync(examplesDir)
    .filter((f) => f.endsWith("-friction-report.json"))
    .sort();
}

function renderOne(filename: string): { mdPath: string; verdict: string; symbol: string } {
  const jsonPath = resolve(examplesDir, filename);
  const report = JSON.parse(readFileSync(jsonPath, "utf8")) as FrictionReport;
  const md = renderMarkdown(report);
  const mdPath = jsonPath.replace(/\.json$/, ".md");
  writeFileSync(mdPath, md);
  return { mdPath, verdict: report.verdict, symbol: report.asset.symbol };
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: render [FILE]");
    console.log("  no args   render all examples/*-friction-report.json");
    console.log("  FILE      render a single JSON report (path or examples/-relative)");
    process.exit(0);
  }

  if (args[0]) {
    const file = args[0].endsWith(".json")
      ? args[0]
      : `${args[0].toLowerCase()}-friction-report.json`;
    const result = renderOne(file.replace(/^.*[\\\/]/, ""));
    console.log(`${result.symbol}  ${result.verdict}  → ${result.mdPath}`);
    return;
  }

  const files = listJsonReports();
  if (files.length === 0) {
    console.error("no examples/*-friction-report.json files found");
    process.exit(1);
  }
  console.log(`rendering ${files.length} reports:`);
  for (const file of files) {
    const result = renderOne(file);
    console.log(`  ${result.symbol.padEnd(7)} ${result.verdict.padEnd(8)} → ${result.mdPath}`);
  }
}

main();
