import { readdirSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const examplesDir = join(root, "examples");
const targetDir = join(root, "dashboard", "reports");

if (!existsSync(examplesDir)) {
  console.error(`examples/ not found at ${examplesDir}`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });

let copied = 0;
for (const file of readdirSync(examplesDir)) {
  if (file.endsWith("-friction-report.json")) {
    copyFileSync(join(examplesDir, file), join(targetDir, file));
    copied++;
  }
}

console.log(`build-dashboard: copied ${copied} report(s) to dashboard/reports/`);
