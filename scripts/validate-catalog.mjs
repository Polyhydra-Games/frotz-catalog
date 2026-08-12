#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const file = process.argv[2] || new URL("../catalog.json", import.meta.url);
const catalog = JSON.parse(await readFile(file, "utf8"));
assert.equal(catalog.schemaVersion, 2, "schemaVersion must be 2");
assert.equal(catalog.catalogScope.canonicalInfocomWorks, 35, "catalog must declare all 35 canonical Infocom works");
assert.equal(catalog.entries.filter((entry) => entry.catalogScope === "canonical").length, 35, "catalog must contain all 35 canonical Infocom works");
assert.ok(catalog.entries.length >= 44, "catalog must include supplementary preservation works");

const entrySlugs = new Set();
const editionIds = new Set();
const normalizedTitles = new Map();
const reconciledAliases = new Set();
let knownEditions = 0;
let observedEditions = 0;
for (const entry of catalog.entries) {
  assert.match(entry.slug, /^[a-z0-9-]+$/, "entry slug must be URL-safe");
  assert.ok(entry.title && entry.runtime, "entry needs title and runtime");
  assert.ok(!entrySlugs.has(entry.slug), `duplicate entry slug: ${entry.slug}`);
  entrySlugs.add(entry.slug);
  const normalizedTitle = entry.title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^(the|a) /, "");
  assert.ok(!normalizedTitles.has(normalizedTitle), `${entry.slug} duplicates the work identity of ${normalizedTitles.get(normalizedTitle)}`);
  normalizedTitles.set(normalizedTitle, entry.slug);
  for (const note of entry.museumNotes || []) {
    const match = note.match(/IFDB bibliographic identity reconciled from (ifdb-[a-z0-9]+);/);
    if (match) reconciledAliases.add(match[1]);
  }
  assert.ok(Array.isArray(entry.editions) && entry.editions.length > 0, `${entry.slug} needs at least one known edition`);

  for (const edition of entry.editions) {
    const qualifiedId = `${entry.slug}/${edition.editionId}`;
    assert.ok(!editionIds.has(qualifiedId), `duplicate edition id: ${qualifiedId}`);
    editionIds.add(qualifiedId);
    assert.equal(edition.runtime, "frotz", `${qualifiedId} has the wrong runtime`);

    const story = edition.storyFile;
    assert.ok(story, `${qualifiedId} needs story-file metadata`);
    assert.ok(story.sourceStatus && story.rightsStatus && story.provenance, `${qualifiedId} needs source and rights provenance`);
    if (story.sourceStatus === "known-external-reference") {
      knownEditions += 1;
      assert.match(edition.historicalFilename, /\.(z[1-8])$/, `${qualifiedId} needs a Z-machine filename`);
      assert.match(edition.serial || "", /^[A-Z0-9]{6}$/i, `${qualifiedId} needs a six-character serial`);
      assert.match(story.checksum?.value || "", /^[a-f0-9]{32}$/, `${qualifiedId} needs an MD5 identity`);
      assert.equal(story.rightsStatus, "proprietary-reference-only", `${qualifiedId} must not imply redistribution rights`);
      assert.ok(!story.storyUrl, `${qualifiedId} must not expose a proprietary download URL`);
    }
    if (story.sourceStatus === "observed-private-holding") {
      observedEditions += 1;
      assert.match(story.checksum?.value || "", /^[a-f0-9]{32}$/, `${qualifiedId} needs an MD5 identity`);
      assert.equal(story.rightsStatus, "proprietary-reference-only", `${qualifiedId} must not imply redistribution rights`);
      assert.ok(!story.storyUrl, `${qualifiedId} must not expose a private story URL`);
    }
  }

  const publishedStories = entry.editions
    .map((edition) => edition.storyFile)
    .filter((story) => Boolean(story?.storyUrl));
  assert.equal(entry.playable, publishedStories.length > 0, `${entry.slug} playable must match its published story locators`);
  for (const story of publishedStories) {
    assert.equal(story.rightsStatus, "external-reference-only", `${entry.slug} must declare source rights for every story URL`);
    assert.match(story.storyUrl, /^https:\/\//, `${entry.slug} story URL must use HTTPS`);
  }
}
for (const alias of reconciledAliases) {
  assert.ok(!entrySlugs.has(alias), `reconciled IFDB alias must not remain as a duplicate work: ${alias}`);
}
assert.equal(knownEditions, catalog.catalogScope.knownCompiledEditions, "known edition count does not match catalog scope");
assert.equal(observedEditions, catalog.catalogScope.observedAdditionalEditions, "observed edition count does not match catalog scope");
assert.ok(knownEditions >= 257, "catalog must retain the complete preservation snapshot");
console.log(`Validated ${catalog.entries.length} works, ${knownEditions} preservation editions, and ${observedEditions} additional observed editions.`);
