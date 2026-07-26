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

## Scope boundary

This repository is exhaustive for the defined Infocom preservation scope, not
for every interactive-fiction work ever published. Broader IF Archive and IFDB
coverage should be added as separately versioned authorities so their much
larger catalogs do not weaken the rights and provenance guarantees here.
Validated public catalog metadata for the Frotz interactive-fiction runtime
