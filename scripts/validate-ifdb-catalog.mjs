#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const file = process.argv[2] || new URL("../ifdb-catalog.json", import.meta.url);
const catalog = JSON.parse(await readFile(file, "utf8"));

assert.equal(catalog.schemaVersion, 1);
assert.equal(catalog.authority.name, "Interactive Fiction Database");
assert.equal(catalog.scope.entries, catalog.entries.length);
assert.ok(catalog.entries.length > 10_000, "expected a full IFDB export");

const tuids = new Set();
let ifidCount = 0;
let frotzCount = 0;
for (const entry of catalog.entries) {
  assert.match(entry.tuid, /^[a-z0-9]+$/i, "entry needs a valid IFDB TUID");
  assert.equal(entry.slug, `ifdb-${entry.tuid}`, `${entry.tuid} needs a stable app slug`);
  assert.ok(!tuids.has(entry.tuid), `duplicate TUID: ${entry.tuid}`);
  tuids.add(entry.tuid);
  assert.ok(entry.title && entry.author, `${entry.tuid} needs title and author`);
  assert.ok(Array.isArray(entry.ifids), `${entry.tuid} needs an IFID array`);
  assert.equal(entry.playable, false, `${entry.tuid} must not imply playable artifact rights`);
  ifidCount += entry.ifids.length;
  if (entry.runtime === "frotz") {
    frotzCount += 1;
    assert.equal(entry.runtimeSupport, "supported");
  }
  const cover = entry.media.coverArtCandidate;
  if (cover) {
    assert.match(cover.url, /^https:\/\/ifdb\.org\/coverart\?/);
    assert.equal(cover.sourceStatus, "external-candidate");
    assert.equal(cover.rightsStatus, "unknown");
  }
}

assert.equal(ifidCount, catalog.scope.ifids);
assert.equal(frotzCount, catalog.scope.frotzCompatibleEntries);

const imageReportFile = process.argv[3] || new URL("../image-match-candidates.json", import.meta.url);
const imageReport = JSON.parse(await readFile(imageReportFile, "utf8"));
assert.equal(imageReport.catalogEntries, catalog.entries.length);
assert.equal(imageReport.matchedEntries, imageReport.matches.length);
assert.equal(
  imageReport.uniqueTitleMatches + imageReport.ambiguousTitleMatches,
  imageReport.matchedEntries
);
for (const match of imageReport.matches) {
  assert.ok(tuids.has(match.tuid), `image match has unknown TUID: ${match.tuid}`);
  for (const candidate of match.candidates) {
    assert.ok(!candidate.relativePath.startsWith("/"), "image candidates must not expose absolute paths");
    assert.ok(!candidate.relativePath.split("/").includes(".."), "image candidates must not escape the image root");
  }
}

console.log(`Validated ${catalog.entries.length} IFDB works, ${ifidCount} IFIDs, ${frotzCount} Frotz-compatible entries, and ${imageReport.matchedEntries} local image candidates.`);
