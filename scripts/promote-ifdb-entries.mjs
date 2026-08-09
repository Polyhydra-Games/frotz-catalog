#!/usr/bin/env node
// Promotes selected entries from ifdb-catalog.json into catalog.json (the
// live production catalog) using the v2 editions/artifacts schema.
//
// Two tracks, matching the licensing split decided for this catalog:
//
//   --track free  Requires exactly one --tuid and a --story-url pointing at
//                 a hand-verified, legally-hosted copy of the story file.
//                 The IFDB `license` field alone is not sufficient
//                 provenance — verify the actual source before using this
//                 track. Produces playable:true.
//
//   --track byog  "Bring your own game." No story source is recorded or
//                 implied; frotz-catalog never hosts or references a
//                 commercial story file. Produces playable:false with
//                 rightsStatus "bring-your-own" so operators know they must
//                 mount their own legally-owned copy into FROTZ_STORY_DIR.
//                 Accepts one or more --tuid values (or --tuid-file).
//
// Usage:
//   node scripts/promote-ifdb-entries.mjs --track free --tuid <tuid> --story-url <url> [--rights-note "..."]
//   node scripts/promote-ifdb-entries.mjs --track byog --tuid <tuid> [--tuid <tuid> ...] [--tuid-file path]
//   ... add --dry-run to preview without writing catalog.json

import { readFile, writeFile } from "node:fs/promises";

function usage(message) {
  if (message) console.error(message);
  console.error(
    "Usage: node promote-ifdb-entries.mjs --track <free|byog> --tuid <tuid> [--tuid <tuid> ...] " +
      "[--tuid-file <path>] [--story-url <url>] [--rights-note <text>] [--dry-run]"
  );
  process.exit(2);
}

function parseArgs(argv) {
  const args = { tuids: [], dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--track":
        args.track = argv[++i];
        break;
      case "--tuid":
        args.tuids.push(argv[++i]);
        break;
      case "--tuid-file":
        args.tuidFile = argv[++i];
        break;
      case "--story-url":
        args.storyUrl = argv[++i];
        break;
      case "--rights-note":
        args.rightsNote = argv[++i];
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      default:
        usage(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function slugifyEdition(entrySlug) {
  return `${entrySlug}-ifdb-import`;
}

function toStoryFile(track, ifdbEntry, storyUrl, rightsNote) {
  if (track === "free") {
    return {
      kind: "story-file",
      runtime: "frotz",
      storyUrl,
      sourceStatus: "present",
      rightsStatus: "external-reference-only",
      provenance:
        rightsNote ||
        `Hand-verified free/legal source for "${ifdbEntry.title}" (IFDB license field: ${ifdbEntry.license ?? "unset"}).`,
      spoilerLevel: "none",
    };
  }
  return {
    kind: "story-file",
    runtime: "frotz",
    sourceStatus: "missing",
    rightsStatus: "bring-your-own",
    provenance:
      `Commercial or unverified-license IFDB title (license: ${ifdbEntry.license ?? "unset"}). ` +
      "frotz-catalog does not host or reference a story-file source for this entry. " +
      "Operators must mount their own legally-owned copy at the documented filename via FROTZ_STORY_DIR.",
    spoilerLevel: "none",
    expectedFilename: `${ifdbEntry.slug}.dat`,
  };
}

function toArtifacts(ifdbEntry) {
  const coverArt = ifdbEntry.media?.coverArtCandidate;
  if (!coverArt) return [];
  return [
    {
      artifactId: `${ifdbEntry.slug}-cover-art`,
      kind: "box-art",
      title: "Cover art",
      sourceStatus: "missing",
      rightsStatus: "unknown",
      provenance:
        `IFDB cover-art candidate at ${coverArt.url}. Not copied or published; requires identity ` +
        "and rights confirmation before a CDN artifact can be attached (see publish-review-queue.mjs).",
      spoilerLevel: "none",
    },
  ];
}

function toCatalogEntry(track, ifdbEntry, { storyUrl, rightsNote }) {
  return {
    slug: ifdbEntry.slug,
    title: ifdbEntry.title,
    sortTitle: ifdbEntry.sortTitle || ifdbEntry.title,
    series: ifdbEntry.series?.name ?? null,
    author: ifdbEntry.author ?? null,
    firstPublishedYear: ifdbEntry.firstPublishedYear ?? null,
    runtime: "frotz",
    playable: track === "free",
    platformHints: ifdbEntry.platformHints ?? ["z-machine", "interactive-fiction", "text-adventure"],
    story: {
      tagline: null,
      synopsis: ifdbEntry.description ?? "",
      spoilerLevel: "none",
      sourceStatus: "imported",
    },
    editions: [
      {
        editionId: slugifyEdition(ifdbEntry.slug),
        title: ifdbEntry.version || "IFDB import",
        releaseYear: ifdbEntry.firstPublishedYear ?? null,
        publisher: null,
        runtime: "frotz",
        storyFile: toStoryFile(track, ifdbEntry, storyUrl, rightsNote),
        artifacts: toArtifacts(ifdbEntry),
      },
    ],
    museumNotes: [
      `Promoted from frotz-catalog's IFDB import (tuid ${ifdbEntry.tuid}, track: ${track}).`,
    ],
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.track !== "free" && args.track !== "byog") {
    usage("--track must be 'free' or 'byog'");
  }

  const repoRoot = new URL("..", import.meta.url);
  const catalogPath = new URL("catalog.json", repoRoot);
  const ifdbPath = new URL("ifdb-catalog.json", repoRoot);

  if (args.tuidFile) {
    const fileContents = await readFile(args.tuidFile, "utf8");
    const fileTuids = fileContents
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    args.tuids.push(...fileTuids);
  }

  if (args.tuids.length === 0) usage("At least one --tuid (or --tuid-file) is required");
  if (args.track === "free" && args.tuids.length !== 1) {
    usage("--track free promotes exactly one title at a time (each needs its own hand-verified --story-url)");
  }
  if (args.track === "free" && !args.storyUrl) {
    usage("--track free requires --story-url");
  }
  if (args.track === "byog" && args.storyUrl) {
    usage("--track byog must not declare a --story-url — frotz-catalog never references a commercial source");
  }

  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const ifdb = JSON.parse(await readFile(ifdbPath, "utf8"));
  const ifdbByTuid = new Map(ifdb.entries.map((entry) => [entry.tuid, entry]));
  const existingSlugs = new Set(catalog.entries.map((entry) => entry.slug));

  const promoted = [];
  for (const tuid of args.tuids) {
    const ifdbEntry = ifdbByTuid.get(tuid);
    if (!ifdbEntry) {
      usage(`No ifdb-catalog.json entry found for tuid ${tuid}`);
    }
    if (ifdbEntry.runtimeSupport !== "supported") {
      usage(`tuid ${tuid} ("${ifdbEntry.title}") is not runtimeSupport:"supported" — not frotz-compatible`);
    }
    if (existingSlugs.has(ifdbEntry.slug)) {
      console.warn(`Skipping ${ifdbEntry.slug} — already present in catalog.json`);
      continue;
    }
    promoted.push(
      toCatalogEntry(args.track, ifdbEntry, { storyUrl: args.storyUrl, rightsNote: args.rightsNote })
    );
    existingSlugs.add(ifdbEntry.slug);
  }

  if (promoted.length === 0) {
    console.log("Nothing to promote.");
    return;
  }

  catalog.entries.push(...promoted);
  catalog.updated = new Date().toISOString().slice(0, 10);

  if (args.dryRun) {
    console.log(JSON.stringify(promoted, null, 2));
    console.log(`Dry run: would add ${promoted.length} entr${promoted.length === 1 ? "y" : "ies"}.`);
    return;
  }

  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Added ${promoted.length} entr${promoted.length === 1 ? "y" : "ies"} to catalog.json.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
