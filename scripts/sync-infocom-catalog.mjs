#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const UPSTREAM_URL = "https://eblong.com/infocom/catalog.json";
const UPSTREAM_CATALOG_URL = "https://eblong.com/infocom/";
const SNAPSHOT_DATE = "2026-06-30";

const works = [
  ["amfv", "A Mind Forever Voyaging", 1985, "canonical", "Science fiction"],
  ["arthur", "Arthur: The Quest for Excalibur", 1989, "canonical", "Fantasy"],
  ["ballyhoo", "Ballyhoo", 1986, "canonical", "Mystery"],
  ["beyond-zork", "Beyond Zork: The Coconut of Quendor", 1987, "canonical", "Fantasy"],
  ["border-zone", "Border Zone", 1987, "canonical", "Espionage"],
  ["bureaucracy", "Bureaucracy", 1987, "canonical", "Comedy"],
  ["cutthroats", "Cutthroats", 1984, "canonical", "Adventure"],
  ["deadline", "Deadline", 1982, "canonical", "Mystery"],
  ["enchanter", "Enchanter", 1983, "canonical", "Fantasy"],
  ["hitchhikers-guide", "The Hitchhiker's Guide to the Galaxy", 1984, "canonical", "Science fiction comedy"],
  ["hollywood-hijinx", "Hollywood Hijinx", 1986, "canonical", "Comedy"],
  ["infidel", "Infidel", 1983, "canonical", "Adventure"],
  ["journey", "Journey: The Quest Begins", 1989, "canonical", "Fantasy"],
  ["leather-goddesses", "Leather Goddesses of Phobos", 1986, "canonical", "Science fiction comedy"],
  ["lurking-horror", "The Lurking Horror", 1987, "canonical", "Horror"],
  ["moonmist", "Moonmist", 1986, "canonical", "Mystery"],
  ["nord-and-bert", "Nord and Bert Couldn't Make Head or Tail of It", 1987, "canonical", "Comedy"],
  ["planetfall", "Planetfall", 1983, "canonical", "Science fiction comedy"],
  ["plundered-hearts", "Plundered Hearts", 1987, "canonical", "Romance"],
  ["seastalker", "Seastalker", 1984, "canonical", "Science fiction"],
  ["sherlock", "Sherlock: The Riddle of the Crown Jewels", 1988, "canonical", "Mystery"],
  ["shogun", "James Clavell's Shōgun", 1989, "canonical", "Historical fiction"],
  ["sorcerer", "Sorcerer", 1984, "canonical", "Fantasy"],
  ["spellbreaker", "Spellbreaker", 1985, "canonical", "Fantasy"],
  ["starcross", "Starcross", 1982, "canonical", "Science fiction"],
  ["stationfall", "Stationfall", 1987, "canonical", "Science fiction comedy"],
  ["suspect", "Suspect", 1984, "canonical", "Mystery"],
  ["suspended", "Suspended", 1983, "canonical", "Science fiction"],
  ["trinity", "Trinity", 1986, "canonical", "Science fiction"],
  ["wishbringer", "Wishbringer", 1985, "canonical", "Fantasy"],
  ["witness", "The Witness", 1983, "canonical", "Mystery"],
  ["zork-i", "Zork I: The Great Underground Empire", 1980, "canonical", "Fantasy"],
  ["zork-ii", "Zork II: The Wizard of Frobozz", 1981, "canonical", "Fantasy"],
  ["zork-iii", "Zork III: The Dungeon Master", 1982, "canonical", "Fantasy"],
  ["zork-zero", "Zork Zero: The Revenge of Megaboz", 1988, "canonical", "Fantasy"],
  ["mini-zork-i", "Mini-Zork I", 1987, "sampler", "Fantasy"],
  ["mini-zork-ii", "Mini-Zork II", null, "unreleased", "Fantasy"],
  ["infocom-sampler", "Infocom Sampler", 1984, "sampler", "Sampler"],
  ["abyss", "The Abyss", 1989, "unreleased", "Science fiction"],
  ["hypochondriac", "Hypochondriac", null, "unreleased", "Comedy"],
  ["restaurant", "The Restaurant at the End of the Universe", null, "unreleased", "Science fiction comedy"],
  ["generic", "Generic Infocom development story", null, "developer-artifact", "Development"],
  ["ziptest", "ZipTest", null, "developer-artifact", "Development"],
  ["zork-undiscovered-underground", "Zork: The Undiscovered Underground", 1997, "post-infocom-continuation", "Fantasy", "Activision"]
];

const upstreamTitles = new Map([
  ["A Mind Forever Voyaging", "amfv"],
  ["Arthur", "arthur"],
  ["Ballyhoo", "ballyhoo"],
  ["Beyond Zork", "beyond-zork"],
  ["Border Zone", "border-zone"],
  ["Bureaucracy", "bureaucracy"],
  ["Cutthroats", "cutthroats"],
  ["Deadline", "deadline"],
  ["Enchanter", "enchanter"],
  ["Hitchhiker's Guide", "hitchhikers-guide"],
  ["Hollywood Hijinx", "hollywood-hijinx"],
  ["Infidel", "infidel"],
  ["Journey", "journey"],
  ["Leather Goddesses of Phobos", "leather-goddesses"],
  ["The Lurking Horror", "lurking-horror"],
  ["Moonmist", "moonmist"],
  ["Nord and Bert Couldn't Make Head or Tail of It", "nord-and-bert"],
  ["Planetfall", "planetfall"],
  ["Plundered Hearts", "plundered-hearts"],
  ["Seastalker", "seastalker"],
  ["Sherlock", "sherlock"],
  ["Shogun", "shogun"],
  ["Sorcerer", "sorcerer"],
  ["Spellbreaker", "spellbreaker"],
  ["Starcross", "starcross"],
  ["Stationfall", "stationfall"],
  ["Suspect", "suspect"],
  ["Suspended", "suspended"],
  ["Trinity", "trinity"],
  ["Wishbringer", "wishbringer"],
  ["The Witness", "witness"],
  ["Zork 1", "zork-i"],
  ["Zork 2", "zork-ii"],
  ["Zork 3", "zork-iii"],
  ["Zork Zero", "zork-zero"],
  ["Mini-Zork 1", "mini-zork-i"],
  ["Mini-Zork 2", "mini-zork-ii"],
  ["Infocom Sampler", "infocom-sampler"],
  ["The Abyss", "abyss"],
  ["Hypochondriac", "hypochondriac"],
  ["Restaurant at the End of the Universe", "restaurant"],
  ["Generic", "generic"],
  ["ZipTest", "ziptest"]
]);

const workBySlug = new Map(works.map(([slug, title, year, scope, genre, publisher = "Infocom"]) => [
  slug,
  { slug, title, firstPublishedYear: year, scope, genre, publisher }
]));

const observedAdditionalEditions = {
  "hollywood-hijinx": [
    ["hollywood-hijinx-r37-s861308-observed", "HIJINX.DAT", 4, "37", "861308", "0913cb424e57f07c14277302954c3a72"]
  ],
  "leather-goddesses": [
    ["leather-goddesses-r87-observed", "LEATHER.DAT", 3, "87", null, "8fef6af3c28f5837434a42d80aa271b7"]
  ],
  "lurking-horror": [
    ["lurking-horror-r221-observed", "LURKING.DAT", 3, "221", null, "88c495fffc1add04e46de9e0f6722362"]
  ],
  "suspended": [
    ["suspended-r5-sdjkrak-observed", "SUSPEND.z3", 3, "5", "DJKRAK", "6e76865aef3a26fa9f498fb22fb7d186"]
  ],
  "zork-i": [
    ["zork-i-r15-unknown-serial-observed", "ZORK1.DAT", 2, "15", "??????", "6fc4a916a6f5696c385b2ffbf3b05d17"]
  ],
  "zork-undiscovered-underground": [
    ["zork-undiscovered-underground-r16-s970828", "ZTUU.z5", 5, "16", "970828", "477e5b150e197ee29abfe5424d0b351c"],
    ["zork-undiscovered-underground-r16-s970828-alternate", "ZTUU.z5", 5, "16", "970828", "e712fdb9306d2ec695775b27199a7e97"]
  ]
};

// IFDB promotions which describe the same work as an Infocom preservation
// record. Their bibliographic metadata is folded into the canonical record;
// keeping both entries would make consumers display the same game twice.
const ifdbDuplicates = new Map([
  ["amfv", "ifdb-4h62dvooeg9ajtfa"], ["arthur", "ifdb-zoohwv5nqye7up2t"],
  ["ballyhoo", "ifdb-b0i6bx7g4rkrekgg"], ["beyond-zork", "ifdb-9h6o1charof548ii"],
  ["border-zone", "ifdb-7epwz167lgruvm0u"], ["bureaucracy", "ifdb-zjyxds3s57pgis3x"],
  ["cutthroats", "ifdb-4ao65o1u0xuvj8jf"], ["deadline", "ifdb-p976o7x5ies9ltdh"],
  ["enchanter", "ifdb-vu4xhul3abknifcr"], ["hitchhikers-guide", "ifdb-ouv80gvsl32xlion"],
  ["hollywood-hijinx", "ifdb-jnfkbgdgopwfqist"], ["infidel", "ifdb-anu79a4n1jedg5mm"],
  ["journey", "ifdb-2752o3sh6y05ob1p"], ["leather-goddesses", "ifdb-3p9fdt4fxr2goctw"],
  ["lurking-horror", "ifdb-jhbd0kja1t57uop"], ["moonmist", "ifdb-c66u816v8kx2jzm2"],
  ["nord-and-bert", "ifdb-zxb8pq3qrkvdob4i"], ["planetfall", "ifdb-xe6kb3cuqwie2q38"],
  ["plundered-hearts", "ifdb-ddagftras22bnz8h"], ["seastalker", "ifdb-56wb8hflec2isvzm"],
  ["sherlock", "ifdb-j8lmspy4iz73mx26"], ["shogun", "ifdb-w3pz3v8wckaw1wgb"],
  ["sorcerer", "ifdb-lidg5nx9ig0bwk55"], ["spellbreaker", "ifdb-wqsmrahzozosu3r"],
  ["starcross", "ifdb-y42oje3ryqi6lohn"], ["stationfall", "ifdb-9nlbhqnlyb169uge"],
  ["suspect", "ifdb-tdbss1ekrp4ua7h4"], ["suspended", "ifdb-t47hei9uq10xoar8"],
  ["trinity", "ifdb-j18kjz80hxjtyayw"], ["wishbringer", "ifdb-z02joykzh66wfhcl"],
  ["witness", "ifdb-6963a47vqgms8wi0"], ["zork-i", "ifdb-0dbnusxunq7fw5ro"],
  ["zork-ii", "ifdb-yzzm4puxyjakk8c4"], ["zork-iii", "ifdb-vrsot1zgy1wfcdru"],
  ["zork-zero", "ifdb-17coplfu323xif76"], ["mini-zork-i", "ifdb-1rea34vqnz3mtyq1"],
  ["mini-zork-ii", "ifdb-rsd9e0bw9s7iq4pe"]
]);

const args = new Map(process.argv.slice(2).map((value, index, all) => {
  if (!value.startsWith("--")) return [value, true];
  const next = all[index + 1];
  return [value, next && !next.startsWith("--") ? next : true];
}));

async function loadUpstream() {
  const sourceFile = args.get("--source");
  if (sourceFile) return JSON.parse(await readFile(sourceFile, "utf8"));
  const response = await fetch(UPSTREAM_URL);
  if (!response.ok) throw new Error(`Could not fetch ${UPSTREAM_URL}: HTTP ${response.status}`);
  return response.json();
}

function editionId(row) {
  return basename(row.filename, `.${row.type}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function editionTitle(row) {
  const release = row.release ? `Release ${row.release}` : "Unnumbered release";
  const serial = row.serial ? `, serial ${row.serial}` : "";
  return `${release}${serial}`;
}

function plausibleSerialYear(serial, fallback) {
  if (!/^\d{6}$/.test(serial || "") || /^0{5}[01]$/.test(serial)) return fallback;
  const month = Number(serial.slice(2, 4));
  const day = Number(serial.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return fallback;
  const shortYear = Number(serial.slice(0, 2));
  return Number(`${shortYear >= 70 ? "19" : "20"}${serial.slice(0, 2)}`);
}

const upstream = await loadUpstream();
const gameFiles = upstream.filter((row) => row.dir === "gamefiles");
const grouped = new Map(works.map(([slug]) => [slug, []]));

for (const row of gameFiles) {
  const slug = upstreamTitles.get(row.title);
  if (!slug) throw new Error(`Unmapped upstream title: ${row.title}`);
  grouped.get(slug).push(row);
}

const seed = JSON.parse(await readFile(new URL("../catalog.json", import.meta.url), "utf8"));
const approvedZork = seed.entries
  .find((entry) => entry.slug === "zork-i")
  ?.editions?.find((edition) => edition.storyFile?.storyUrl);

const generatedEntries = [...workBySlug.values()].map((work) => {
  const editions = grouped.get(work.slug)
    .sort((a, b) => a.filename.localeCompare(b.filename))
    .map((row) => ({
      editionId: editionId(row),
      title: editionTitle(row),
      releaseYear: plausibleSerialYear(row.serial, work.firstPublishedYear),
      publisher: "Infocom",
      runtime: "frotz",
      releaseNumber: row.release || null,
      serial: row.serial || null,
      zMachineVersion: Number(row.type.slice(1)),
      historicalFilename: row.filename,
      tags: row.tags ? row.tags.split("-").filter(Boolean) : [],
      notes: row.comment || null,
      storyFile: {
        kind: "story-file",
        runtime: "frotz",
        sourceStatus: "known-external-reference",
        rightsStatus: "proprietary-reference-only",
        provenance: "Edition identity and checksum from the Obsessively Complete Infocom Catalog.",
        referenceCatalogUrl: UPSTREAM_CATALOG_URL,
        checksum: { algorithm: "md5", value: row.md5 },
        spoilerLevel: "none"
      }
    }));

  for (const [id, filename, version, release, serial, md5] of observedAdditionalEditions[work.slug] || []) {
    editions.push({
      editionId: id,
      title: `Observed release ${release}${serial ? `, serial ${serial}` : ""}`,
      releaseYear: plausibleSerialYear(serial, work.firstPublishedYear),
      publisher: work.publisher,
      runtime: "frotz",
      releaseNumber: release,
      serial,
      zMachineVersion: version,
      historicalFilename: filename,
      tags: ["observed"],
      notes: "Observed in a private preservation holding; not present as an exact checksum in the cited upstream snapshot.",
      storyFile: {
        kind: "story-file",
        runtime: "frotz",
        sourceStatus: "observed-private-holding",
        rightsStatus: "proprietary-reference-only",
        provenance: "Header identity and checksum recorded by the local holdings audit; binary and private storage location are not published.",
        checksum: { algorithm: "md5", value: md5 },
        spoilerLevel: "none"
      }
    });
  }

  if (work.slug === "zork-i" && approvedZork) {
    editions.unshift(approvedZork);
  }

  const duplicate = seed.entries.find((entry) => entry.slug === ifdbDuplicates.get(work.slug));
  const existingWork = seed.entries.find((entry) => entry.slug === work.slug);
  const bibliography = duplicate || existingWork;
  const duplicateArtifacts = duplicate?.editions?.[0]?.artifacts
    || existingWork?.editions?.find((edition) => edition.artifacts?.length)?.artifacts;
  if (duplicateArtifacts?.length) {
    const targetEdition = editions.find((edition) => edition.storyFile?.storyUrl) || editions[0];
    targetEdition.artifacts = duplicateArtifacts;
  }

  return {
    slug: work.slug,
    title: work.title,
    sortTitle: work.title.replace(/^The /, "").replace(/^A /, ""),
    series: work.slug.startsWith("zork") || work.slug.startsWith("mini-zork") ? "Zork" : undefined,
    publisher: work.publisher,
    firstPublishedYear: work.firstPublishedYear,
    catalogScope: work.scope,
    genre: work.genre,
    author: bibliography?.author,
    runtime: "frotz",
    playable: editions.some((edition) => Boolean(edition.storyFile?.storyUrl)),
    platformHints: ["z-machine", "interactive-fiction", "text-adventure"],
    story: {
      synopsis: bibliography?.story?.synopsis || (work.scope === "canonical"
        ? "One of Infocom's 35 canonical interactive-fiction titles."
        : `Preservation catalog entry classified as ${work.scope}.`),
      spoilerLevel: "none",
      sourceStatus: "curated"
    },
    editions,
    museumNotes: [
      "Metadata and checksums only; no proprietary story binary is stored in this repository.",
      ...(ifdbDuplicates.has(work.slug)
        ? [`IFDB bibliographic identity reconciled from ${ifdbDuplicates.get(work.slug)}; duplicate work record removed.`]
        : [])
    ]
  };
});

const duplicateSlugs = new Set(ifdbDuplicates.values());
const retainedEntries = seed.entries.filter((entry) => !workBySlug.has(entry.slug) && !duplicateSlugs.has(entry.slug));
const entries = [...generatedEntries, ...retainedEntries];

const catalog = {
  ...seed,
  schemaVersion: 2,
  updated: SNAPSHOT_DATE,
  catalogScope: {
    canonicalInfocomWorks: 35,
    supplementaryWorks: generatedEntries.length - 35,
    knownCompiledEditions: gameFiles.length,
    observedAdditionalEditions: Object.values(observedAdditionalEditions).flat().length,
    definition: "All 35 canonical Infocom interactive-fiction works plus recovered samplers, unreleased works, development artifacts, and the locally held post-Infocom Z-machine continuation."
  },
  catalogAuthorities: {
    ...seed.catalogAuthorities,
    identity: "frotz-catalog static JSON",
    editionPreservation: UPSTREAM_URL,
    storySource: "approved external reference only",
    media: "Api.CDN when a rights-cleared artifact is published"
  },
  entries
};

const output = args.get("--output") || new URL("../catalog.json", import.meta.url);
await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${entries.length} works and ${gameFiles.length} known compiled editions.`);
