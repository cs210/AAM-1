import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const messagesDir = path.join(process.cwd(), "messages");
const baseLocale = "en";
const basePath = path.join(messagesDir, `${baseLocale}.json`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getKind(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value === "object" ? "object" : typeof value;
}

function compare(baseValue, localeValue, keyPath, errors) {
  const baseKind = getKind(baseValue);
  const localeKind = getKind(localeValue);

  if (baseKind !== localeKind) {
    errors.push(`${keyPath}: expected ${baseKind}, found ${localeKind}`);
    return;
  }

  if (baseKind !== "object") {
    return;
  }

  for (const key of Object.keys(baseValue)) {
    const nextPath = keyPath ? `${keyPath}.${key}` : key;
    if (!(key in localeValue)) {
      errors.push(`${nextPath}: missing`);
      continue;
    }
    compare(baseValue[key], localeValue[key], nextPath, errors);
  }

  for (const key of Object.keys(localeValue)) {
    if (key in baseValue) continue;
    const nextPath = keyPath ? `${keyPath}.${key}` : key;
    errors.push(`${nextPath}: extra key`);
  }
}

const baseMessages = readJson(basePath);
const localeFiles = fs
  .readdirSync(messagesDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

const failures = [];

for (const file of localeFiles) {
  if (file === `${baseLocale}.json`) continue;
  const localePath = path.join(messagesDir, file);
  const localeMessages = readJson(localePath);
  const errors = [];
  compare(baseMessages, localeMessages, "", errors);
  if (errors.length > 0) {
    failures.push({ file, errors });
  }
}

if (failures.length > 0) {
  console.error(`Message schema mismatch against ${baseLocale}.json`);
  for (const failure of failures) {
    console.error(`\n${failure.file}`);
    for (const error of failure.errors) {
      console.error(`  - ${error}`);
    }
  }
  process.exit(1);
}

console.log(`Validated ${localeFiles.length} locale files against ${baseLocale}.json`);
