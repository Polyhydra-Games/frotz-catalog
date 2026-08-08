#!/usr/bin/env node
// Builds a human-reviewable queue for cover-art publication. It does NOT
// upload anything or touch catalog.json — image-match-candidates.json only
// records a title match against a private local image tree; identity and
// rights still need a human to confirm before anything is published to the
// Api.CDN. This script narrows 1,013 raw matches down to the ones that are
// actually useful right now (unambiguous, and for a title already promoted
// into catalog.json) and writes them as CSV for review.
//
// Usage:
//   node scripts/publish-review-queue.mjs [--out review-queue.csv] [--include-ambiguous]
//
// With --include-ambiguous, ambiguous-title-match entries are also included,
// one row per candidate, since disambiguating which (if any) candidate is
// correct is exactly the kind of judgment call this queue exists for.
//
// After review, approved rows still need a manual step: upload the image at
// <retro_v2 root>/<relativePath> via Api.CDN's /api/v1/uploads flow, then
// hand the resulting publicUrl + rights decision to a small follow-up patch
// of the matching catalog.json artifact (sourceStatus, rightsStatus,
// cdnUrl, provenance).

import { readFile, writeFile } from "node:fs/promises";

function parseArgs(argv) {
  const args = { out: "review-queue.csv", includeAmbiguous: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--out") args.out = argv[++i];
    if (argv[i] === "--include-ambiguous") args.includeAmbiguous = true;
  }
  return args;
}

function tuidFromSlug(slug) {
  return slug.startsWith("ifdb-") ? slug.slice("ifdb-".length) : null;
}

function csvField(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = new URL("..", import.meta.url);
  const catalog = JSON.parse(await readFile(new URL("catalog.json", repoRoot), "utf8"));
  const candidates = JSON.parse(await readFile(new URL("image-match-candidates.json", repoRoot), "utf8"));
  const matchByTuid = new Map(candidates.matches.map((match) => [match.tuid, match]));

  const rows = [];
  for (const entry of catalog.entries) {
    const tuid = tuidFromSlug(entry.slug);
    if (!tuid) continue; // hand-curated entries (e.g. zork-i) aren't IFDB-sourced

    const match = matchByTuid.get(tuid);
    if (!match) continue;
    const isUnambiguous = match.status === "title-match-needs-review" && match.candidates.length === 1;
    const isAmbiguous = args.includeAmbiguous && match.status === "ambiguous-title-match";
    if (!isUnambiguous && !isAmbiguous) continue;

    const artifact = entry.editions
      ?.flatMap((edition) => edition.artifacts ?? [])
      .find((item) => item.kind === "box-art" && item.sourceStatus === "missing");
    if (!artifact) continue; // already has art, or no box-art slot was created

    for (const candidate of match.candidates) {
      rows.push({
        slug: entry.slug,
        title: entry.title,
        artifactId: artifact.artifactId,
        matchedSystem: candidate.system,
        matchedGame: candidate.game,
        relativePath: candidate.relativePath,
      });
    }
  }

  const header = ["slug", "title", "artifactId", "matchedSystem", "matchedGame", "relativePath", "approved", "reviewerNote"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [row.slug, row.title, row.artifactId, row.matchedSystem, row.matchedGame, row.relativePath, "", ""]
        .map(csvField)
        .join(",")
    );
  }

  await writeFile(args.out, `${lines.join("\n")}\n`);
  console.log(`Wrote ${rows.length} review rows to ${args.out}.`);
  console.log(
    "Fill in 'approved' (yes/no) and 'reviewerNote' per row after confirming identity and rights, " +
      "then publish approved rows through Api.CDN's /api/v1/uploads and patch the matching catalog.json artifact by hand."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
