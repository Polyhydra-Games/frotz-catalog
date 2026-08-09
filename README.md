# Frotz catalog

Public, metadata-only catalog for the Frotz interactive-fiction runtime. It owns
game/edition metadata, approved external artifact locators, checksums when known,
and rights/source status. It never stores story binaries, manuals, or feelies.

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

The runtime reads `catalog.json` through:

```text
https://raw.githubusercontent.com/lancer1977/frotz-catalog/main/catalog.json
```

Validate before publishing:

```bash
node scripts/validate-catalog.mjs
```
Validated public catalog metadata for the Frotz interactive-fiction runtime
