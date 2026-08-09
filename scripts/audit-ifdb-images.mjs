#!/usr/bin/env node
import { readdir, writeFile } from "node:fs/promises";
import { relative, sep } from "node:path";

const [catalogFile, imageRoot, outputFile] = process.argv.slice(2);
if (!catalogFile || !imageRoot) {
  console.error("Usage: node scripts/audit-ifdb-images.mjs ifdb-catalog.json /path/to/retro_v2 [report.json]");
  process.exit(2);
}

const catalog = JSON.parse(await (await import("node:fs/promises")).readFile(catalogFile, "utf8"));
const normalize = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "");

const imageNames = new Set(["boxart.png", "boxart.jpg", "boxart.jpeg", "cover.png", "cover.jpg", "cover.jpeg"]);
const localByTitle = new Map();

for (const item of await readdir(imageRoot, { recursive: true, withFileTypes: true })) {
  if (!item.isFile() || !imageNames.has(item.name.toLowerCase())) continue;
  const relativeDirectory = relative(imageRoot, item.parentPath);
  const parts = relativeDirectory.split(sep);
  if (parts.length !== 2 || parts.some((part) => part.startsWith("#") || part.startsWith("@"))) continue;
  const [system, game] = parts;
  const key = normalize(game);
  localByTitle.set(key, [...(localByTitle.get(key) || []), {
    system,
    game,
    image: item.name,
    relativePath: `${system}/${game}/${item.name}`
  }]);
}

const matches = [];
for (const entry of catalog.entries) {
  const candidates = localByTitle.get(normalize(entry.title)) || [];
  if (candidates.length) {
    matches.push({
      tuid: entry.tuid,
      title: entry.title,
      candidates,
      status: candidates.length === 1 ? "title-match-needs-review" : "ambiguous-title-match"
    });
  }
}

const report = {
  catalogEntries: catalog.entries.length,
  localImageTitles: localByTitle.size,
  matchedEntries: matches.length,
  uniqueTitleMatches: matches.filter((match) => match.candidates.length === 1).length,
  ambiguousTitleMatches: matches.filter((match) => match.candidates.length > 1).length,
  note: "Title matches are candidates only. Verify game identity and asset rights before publishing a CDN URL.",
  matches
};

if (outputFile) await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Found ${report.matchedEntries} IFDB/local image title matches (${report.uniqueTitleMatches} unique, ${report.ambiguousTitleMatches} ambiguous).`);
