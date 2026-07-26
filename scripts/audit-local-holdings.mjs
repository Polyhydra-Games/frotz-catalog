#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const UPSTREAM_URL = "https://eblong.com/infocom/catalog.json";
const directory = process.argv[2];

if (!directory) {
  console.error("Usage: node scripts/audit-local-holdings.mjs /path/to/infocom-zips [--json]");
  process.exit(2);
}

const response = await fetch(UPSTREAM_URL);
if (!response.ok) throw new Error(`Could not fetch preservation metadata: HTTP ${response.status}`);
const upstream = await response.json();
const knownByMd5 = new Map(
  upstream
    .filter((row) => row.dir === "gamefiles")
    .map((row) => [row.md5, row])
);
const identityKey = (type, release, serial) => `${type}:${release}:${serial}`;
const knownByIdentity = new Map();
for (const row of upstream.filter((item) => item.dir === "gamefiles")) {
  const key = identityKey(row.type, row.release, row.serial);
  knownByIdentity.set(key, [...(knownByIdentity.get(key) || []), row]);
}

const archiveNames = (await readdir(directory))
  .filter((name) => name.toLowerCase().endsWith(".zip"))
  .sort();
const holdings = [];

for (const archiveName of archiveNames) {
  const archivePath = join(directory, archiveName);
  const members = execFileSync("unzip", ["-Z1", archivePath], { encoding: "utf8" })
    .split("\n")
    .filter((name) => /\.(?:z[1-8]|dat)$/i.test(name));
  const stories = members.map((member) => {
    const bytes = execFileSync("unzip", ["-p", archivePath, member], {
      encoding: "buffer",
      maxBuffer: 16 * 1024 * 1024
    });
    const md5 = createHash("md5").update(bytes).digest("hex");
    const known = knownByMd5.get(md5);
    const type = `z${bytes[0]}`;
    const release = bytes.readUInt16BE(2).toString();
    const serial = bytes.subarray(0x12, 0x18).toString("ascii");
    const identityMatches = knownByIdentity.get(identityKey(type, release, serial)) || [];
    return {
      member: basename(member),
      bytes: bytes.length,
      md5,
      zMachineVersion: bytes[0],
      release,
      serial,
      exactMatch: known ? {
        title: known.title,
        release: known.release,
        serial: known.serial,
        historicalFilename: known.filename
      } : null,
      identityMatches: identityMatches.map((row) => ({
        title: row.title,
        historicalFilename: row.filename
      }))
    };
  });
  holdings.push({ archive: archiveName, stories });
}

const storyFiles = holdings.flatMap((holding) => holding.stories);
const report = {
  archiveCount: holdings.length,
  storyFileCount: storyFiles.length,
  exactChecksumMatches: storyFiles.filter((story) => story.exactMatch).length,
  additionalHeaderIdentityMatches: storyFiles.filter((story) => !story.exactMatch && story.identityMatches.length).length,
  unrecognizedStoryFiles: storyFiles.filter((story) => !story.exactMatch && !story.identityMatches.length).length,
  holdings
};

const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0) {
  const output = process.argv[outputIndex + 1];
  if (!output) throw new Error("--output needs a filename");
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Audited ${report.archiveCount} archives containing ${report.storyFileCount} likely story files.`);
  console.log(`${report.exactChecksumMatches} exact checksum matches; ${report.additionalHeaderIdentityMatches} additional release/serial matches; ${report.unrecognizedStoryFiles} unrecognized files.`);
  for (const holding of holdings.filter((item) => item.stories.some((story) => !story.exactMatch && !story.identityMatches.length))) {
    for (const story of holding.stories.filter((item) => !item.exactMatch && !item.identityMatches.length)) {
      console.log(`UNRECOGNIZED\t${holding.archive}\t${story.member}\t${story.md5}\tr${story.release}-s${story.serial}`);
    }
  }
}
