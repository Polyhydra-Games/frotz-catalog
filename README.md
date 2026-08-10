# Frotz catalog

Public, metadata-only catalog for the Frotz interactive-fiction runtime. It owns
game/edition metadata, approved external artifact locators, checksums when known,
and rights/source status. It never stores story binaries, manuals, or feelies.

## Coverage

`catalog.json` covers all 35 canonical Infocom interactive-fiction works and the
recovered samplers, unreleased works, and developer artifacts represented in
[Andrew Plotkin's Obsessively Complete Infocom Catalog](https://eblong.com/infocom/).
The current preservation snapshot identifies 43 Infocom works and 257 compiled
editions. The catalog also records the post-Infocom
*Zork: The Undiscovered Underground* and seven additional story-file variants
observed in a private collection, for 44 works and 264 historical edition
identities. A separately approved Zork I runtime locator brings the generated
edition-record total to 265.

An edition's presence in the catalog does **not** grant redistribution rights.
Except for a separately approved public locator, proprietary editions contain
identity metadata and checksums only. Local holdings, hostnames, and NAS paths
are deliberately excluded from this public repository.

The runtime reads the organization-owned catalog through:

```text
https://raw.githubusercontent.com/Polyhydra-Games/frotz-catalog/main/catalog.json
```

Validate before publishing:

```bash
node scripts/validate-catalog.mjs
```

Refresh the generated catalog from the preservation authority:

```bash
node scripts/sync-infocom-catalog.mjs
node scripts/validate-catalog.mjs
```

For an offline/reviewable source snapshot:

```bash
node scripts/sync-infocom-catalog.mjs --source path/to/catalog.json
```

The synchronization script intentionally imports metadata only. It never
downloads story files.

Audit a private ZIP collection without publishing its path or contents:

```bash
node scripts/audit-local-holdings.mjs /path/to/infocom-zips
```

The audit hashes likely Z-machine story members in place and compares them with
the preservation catalog. It does not extract or copy them into this repository.

## IFDB flatfile

`ifdb-catalog.json` is an app-ready projection of the June 1, 2026 public
[Interactive Fiction Database export](https://www.ifarchive.org/indexes/if-archive/info/ifdb/).
It contains 15,544 works, 7,473 IFIDs, and 63 entries currently identified as
Frotz-compatible. Each record includes:

- stable IFDB TUID and Treaty of Babel IFIDs;
- stable app slug in the form `ifdb-TUID`;
- title, author, publication date, language, genre, tags, and series;
- a plain-text description safe for rendering without injecting IFDB HTML;
- source system and normalized runtime support;
- IFDB listing/version provenance;
- an external cover-art candidate when IFDB reports one.

The flatfile deliberately excludes game downloads and sets every imported entry
to `playable: false`. Artifact availability and metadata presence are separate
facts.

Validate it with:

```bash
node scripts/validate-ifdb-catalog.mjs
```

## Refreshing IFDB

IFDB asks bulk consumers to use its roughly quarterly database exports instead
of crawling the low-volume API. Download the newest ZIP from the
[IF Archive IFDB directory](https://www.ifarchive.org/indexes/if-archive/info/ifdb/)
and run:

```bash
node scripts/import-ifdb-export.mjs path/to/ifdb-archive.zip
node scripts/validate-ifdb-catalog.mjs
```

The importer reads only the public `games` and `ifids` tables. It does not need
an IFDB account and does not ingest users, reviews, ratings, or personal data.

For targeted live refreshes, use IFDB's JSON `viewgame` API with a descriptive
User-Agent and keep request volume low:

```text
https://ifdb.org/viewgame?json&id=TUID
```

## Images

`image-match-candidates.json` is a non-destructive reconciliation report against
the private `retro_v2` image tree. It contains 1,013 title matches:

- 604 unique title matches;
- 409 ambiguous matches requiring identity review.

Regenerate the report without copying images:

```bash
node scripts/audit-ifdb-images.mjs \
  ifdb-catalog.json \
  /path/to/images/retro_v2 \
  image-match-candidates.json
```

The report stores relative candidate paths only. A title match is not enough to
publish an image: verify the IFDB identity and the local asset's rights first.
IFDB states that cover art retains its individual copyright, so IFDB cover URLs
remain `external-candidate` with `rightsStatus: unknown`; they are not
downloaded into this repository or automatically copied to the CDN.

## Attribution and boundaries

IFDB bibliographical contributions are attributed to IFDB and their credited
contributors under IFDB's stated Creative Commons terms. Cover art and games
have separate copyrights and are not covered by that metadata license.

- IFDB API documentation: <https://ifdb.org/api/>
- IFDB copyright guidance: <https://ifdb.org/copyright>
- Treaty of Babel identifiers: <https://babel.ifarchive.org/>

## Scope boundary

This repository is exhaustive for the defined Infocom preservation scope, not
for every interactive-fiction work ever published. Broader IF Archive and IFDB
coverage should be added as separately versioned authorities so their much
larger catalogs do not weaken the rights and provenance guarantees here.
Validated public catalog metadata for the Frotz interactive-fiction runtime
