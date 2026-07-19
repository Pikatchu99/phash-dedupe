#!/usr/bin/env node
import { parseArgs } from "node:util";
import { relative } from "node:path";
import { unlink } from "node:fs/promises";
import { findDuplicates } from "./find-duplicates.js";

const HELP = `phash-dedupe — find near-duplicate images in a folder

Usage:
  phash-dedupe <dir> [options]

Options:
  --threshold <n>    Max Hamming distance to consider a match (default: 6, out of 64)
  --hash-size <n>    Hash resolution, higher = more precise/stricter (default: 8)
  --no-recursive     Don't scan subdirectories
  --json             Print machine-readable JSON instead of a text report
  --delete           Delete every duplicate except the first (alphabetically) in each cluster
  --dry-run          With --delete, print what would be removed without touching any file
  -h, --help         Show this help

Examples:
  phash-dedupe ./stickers
  phash-dedupe ./stickers --threshold 4 --json > report.json
  phash-dedupe ./stickers --delete --dry-run
`;

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      threshold: { type: "string" },
      "hash-size": { type: "string" },
      recursive: { type: "boolean", default: true },
      json: { type: "boolean", default: false },
      delete: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    process.stdout.write(HELP);
    process.exit(values.help ? 0 : 1);
  }

  const dir = positionals[0]!; // length checked above, or we've already exited
  const threshold = values.threshold ? Number(values.threshold) : undefined;
  const hashSize = values["hash-size"] ? Number(values["hash-size"]) : undefined;

  const { clusters } = await findDuplicates(dir, {
    threshold,
    hashSize,
    recursive: values.recursive,
    onProgress: values.json ? undefined : (done, total) => process.stderr.write(`\rhashing ${done}/${total}`),
  });

  if (!values.json) process.stderr.write("\n");

  const toDelete: string[] = [];
  for (const cluster of clusters) {
    const sorted = [...cluster].sort();
    toDelete.push(...sorted.slice(1));
  }

  if (values.json) {
    process.stdout.write(JSON.stringify({ clusters, toDelete }, null, 2) + "\n");
  } else if (clusters.length === 0) {
    console.log("No near-duplicates found.");
  } else {
    console.log(`${clusters.length} duplicate cluster(s), ${toDelete.length} file(s) redundant:\n`);
    for (const cluster of clusters) {
      const sorted = [...cluster].sort();
      console.log(`  keep   ${relative(process.cwd(), sorted[0]!)}`); // clusters always have 2+ members
      for (const file of sorted.slice(1)) console.log(`  remove ${relative(process.cwd(), file)}`);
      console.log("");
    }
  }

  if (values.delete) {
    if (values["dry-run"]) {
      console.log(`(dry run) would delete ${toDelete.length} file(s)`);
    } else {
      for (const file of toDelete) await unlink(file);
      console.log(`Deleted ${toDelete.length} file(s).`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
