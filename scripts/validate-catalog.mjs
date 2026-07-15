#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../catalog.json", import.meta.url), "utf8"));
assert.equal(catalog.schemaVersion, 2, "schemaVersion must be 2");
assert.ok(Array.isArray(catalog.entries) && catalog.entries.length >= 2, "catalog needs a seed and a placeholder");
for (const entry of catalog.entries) {
  assert.match(entry.slug, /^[a-z0-9-]+$/, "entry slug must be URL-safe");
  assert.ok(entry.title && entry.runtime, "entry needs title and runtime");
  if (entry.playable) {
    const story = entry.editions?.flatMap((edition) => [edition.storyFile]).find((file) => file?.storyUrl);
    assert.ok(story, `${entry.slug} is playable but has no approved story URL`);
    assert.equal(story.rightsStatus, "external-reference-only", `${entry.slug} must declare source rights`);
  }
}
console.log(`Validated ${catalog.entries.length} catalog entries.`);
