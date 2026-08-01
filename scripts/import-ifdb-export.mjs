#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { basename } from "node:path";

const DEFAULT_SNAPSHOT_URL = "https://www.ifarchive.org/if-archive/info/ifdb/ifdb-archive-20260601.zip";
const SNAPSHOT_DATE = "2026-06-01";
const input = process.argv[2];
const output = process.argv[3] || new URL("../ifdb-catalog.json", import.meta.url);

if (!input) {
  console.error("Usage: node scripts/import-ifdb-export.mjs path/to/ifdb-archive.sql [output.json]");
  process.exit(2);
}

const sql = input.toLowerCase().endsWith(".zip")
  ? execFileSync("unzip", ["-p", input], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 })
  : await readFile(input, "utf8");

function extractRows(table) {
  const marker = `INSERT INTO \`${table}\` VALUES `;
  const rows = [];
  let searchFrom = 0;
  while (true) {
    const start = sql.indexOf(marker, searchFrom);
    if (start < 0) break;
    const valuesStart = start + marker.length;
    const end = findStatementEnd(sql, valuesStart);
    if (end < 0) throw new Error(`Unterminated table data: ${table}`);
    rows.push(...parseValues(sql.slice(valuesStart, end)));
    searchFrom = end + 1;
  }
  if (!rows.length) throw new Error(`Missing table data: ${table}`);
  return rows;
}

function findStatementEnd(text, start) {
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "'") quoted = false;
    } else if (char === "'") {
      quoted = true;
    } else if (char === ";") {
      return index;
    }
  }
  return -1;
}

function parseValues(text) {
  const rows = [];
  let row = null;
  let value = "";
  let quoted = false;
  let escaped = false;
  let wasQuoted = false;

  const pushValue = () => {
    const raw = value;
    row.push(wasQuoted ? raw : raw === "NULL" ? null : raw);
    value = "";
    wasQuoted = false;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) {
        value += decodeMysqlEscape(char);
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "'") {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === "'") {
      quoted = true;
      wasQuoted = true;
    } else if (char === "(") {
      row = [];
    } else if (char === "," && row) {
      pushValue();
    } else if (char === ")" && row) {
      pushValue();
      rows.push(row);
      row = null;
    } else if (row && !/\s/.test(char)) {
      value += char;
    }
  }
  return rows;
}

function decodeMysqlEscape(char) {
  return {
    "0": "\0",
    b: "\b",
    n: "\n",
    r: "\r",
    t: "\t",
    Z: "\x1a"
  }[char] ?? char;
}

function textFromHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeRuntime(system) {
  const normalized = String(system || "").toLowerCase();
  if (normalized === "z-code" || normalized === "zil") return "frotz";
  if (normalized.includes("glulx")) return "glulx";
  if (normalized.includes("tads")) return "tads";
  if (normalized.includes("adrift")) return "adrift";
  if (normalized.includes("twine")) return "twine";
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function yearFromPublished(value) {
  const match = String(value || "").match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function coverCandidate(tuid, coverart, pageVersion) {
  if (!coverart) return null;
  return {
    kind: "cover-art",
    url: `https://ifdb.org/coverart?id=${encodeURIComponent(tuid)}&version=${encodeURIComponent(pageVersion)}`,
    sourceStatus: "external-candidate",
    rightsStatus: "unknown",
    provenance: "IFDB cover-art reference. Catalog presence does not grant copying, redistribution, or CDN publication rights."
  };
}

const games = extractRows("games");
const ifidRows = extractRows("ifids");
const ifidsByGame = new Map();
for (const [ifid, gameid] of ifidRows) {
  ifidsByGame.set(gameid, [...(ifidsByGame.get(gameid) || []), ifid]);
}

const entries = games.map((row) => {
  const [
    tuid, title, author, , sortTitle, , tags, published, version, license,
    system, language, description, coverart, seriesName, seriesNumber, genre,
    forgiveness, bafsId, website, downloadNotes, , , modified, pageVersion
  ] = row;
  const runtime = normalizeRuntime(system);
  return {
    slug: `ifdb-${tuid}`,
    tuid,
    ifids: (ifidsByGame.get(tuid) || []).sort(),
    title,
    sortTitle: sortTitle || title,
    author,
    firstPublished: published?.slice(0, 10) || null,
    firstPublishedYear: yearFromPublished(published),
    version: version || null,
    system: system || null,
    runtime,
    runtimeSupport: runtime === "frotz" ? "supported" : "catalog-only",
    platformHints: [system, runtime, "interactive-fiction"].filter(Boolean),
    language: language || null,
    genre: genre || null,
    series: seriesName ? { name: seriesName, number: seriesNumber || null } : null,
    forgiveness: forgiveness || null,
    license: license || null,
    tags: String(tags || "").split(",").map((tag) => tag.trim()).filter(Boolean).sort(),
    description: textFromHtml(description),
    website: website || null,
    downloadNotes: textFromHtml(downloadNotes),
    bafsId: bafsId && bafsId !== "0" ? Number(bafsId) : null,
    playable: false,
    media: {
      coverArtCandidate: coverCandidate(tuid, coverart, pageVersion)
    },
    authority: {
      source: "IFDB",
      tuid,
      pageVersion: Number(pageVersion),
      modified: modified?.replace(" ", "T") + "Z",
      listingUrl: `https://ifdb.org/viewgame?id=${encodeURIComponent(tuid)}`
    }
  };
}).sort((left, right) => left.tuid.localeCompare(right.tuid));

const catalog = {
  schemaVersion: 1,
  updated: SNAPSHOT_DATE,
  authority: {
    name: "Interactive Fiction Database",
    snapshotUrl: DEFAULT_SNAPSHOT_URL,
    snapshotDate: SNAPSHOT_DATE,
    apiDocumentation: "https://ifdb.org/api/",
    terms: "https://ifdb.org/copyright"
  },
  scope: {
    entries: entries.length,
    ifids: ifidRows.length,
    frotzCompatibleEntries: entries.filter((entry) => entry.runtime === "frotz").length,
    definition: "Metadata projection of the public IFDB database export. Download links and binaries are excluded; cover art is an external candidate until rights and local publication are verified."
  },
  entries
};

await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Imported ${entries.length} IFDB works and ${ifidRows.length} IFIDs from ${basename(input)}.`);
