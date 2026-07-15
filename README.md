# Frotz catalog

Public, metadata-only catalog for the Frotz interactive-fiction runtime. It owns
game/edition metadata, approved external artifact locators, checksums when known,
and rights/source status. It never stores story binaries, manuals, or feelies.

The runtime reads `catalog.json` through:

```text
https://raw.githubusercontent.com/lancer1977/frotz-catalog/main/catalog.json
```

Validate before publishing:

```bash
node scripts/validate-catalog.mjs
```
Validated public catalog metadata for the Frotz interactive-fiction runtime
