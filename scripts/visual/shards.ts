import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CaptureRecord, CaptureTarget } from './types';

export type Share = { index: number; total: number };

// "2/6" is the third of six shares. Indexes start at 0, like GitHub's strategy.job-index.
export function parseShare(value: string): Share {
    const match = /^(\d+)\/(\d+)$/.exec(value);
    const index = Number(match?.[1]);
    const total = Number(match?.[2]);
    if (!match || total < 1 || index >= total) throw new Error(`Expected a share like 0/6, got "${value}"`);
    return { index, total };
}

// Deals the sorted list out like cards. A story's shots sit next to each other in the list,
// so the shots of a slow story land in different shares.
export const shareOf = <Item>(items: Item[], { index, total }: Share): Item[] => items.filter((_, position) => position % total === index);

// Puts every share's records back in story-list order. A missing, doubled or unknown record means
// a share was lost or mixed up, and comparing anyway could hide a change, so the run stops.
export function joinShares(targets: CaptureTarget[], records: CaptureRecord[]): CaptureRecord[] {
    const byId = new Map<string, CaptureRecord>();
    for (const record of records) {
        if (byId.has(record.id)) throw new Error(`Captured twice: ${record.id}`);
        byId.set(record.id, record);
    }
    const missing = targets.filter((target) => !byId.has(target.id)).map((target) => target.id);
    if (missing.length > 0) throw new Error(`Missing ${missing.length} of ${targets.length} captures, first: ${missing[0]}`);
    const known = new Set(targets.map((target) => target.id));
    const unknown = records.find((record) => !known.has(record.id));
    if (unknown) throw new Error(`Captured but not in the story list: ${unknown.id}`);
    return targets.map((target) => byId.get(target.id) as CaptureRecord);
}

const RECORDS_FILE = /^records-\d+\.json$/;

export function writeShareRecords(dir: string, index: number, records: CaptureRecord[]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `records-${index}.json`), JSON.stringify(records));
}

// Joins the records every share left in `dir`, then removes their files, so the folder looks
// the same as a single-job capture.
export function joinShareFiles(dir: string, targets: CaptureTarget[]): CaptureRecord[] {
    const files = readdirSync(dir).filter((name) => RECORDS_FILE.test(name));
    const records = files.flatMap((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as CaptureRecord[]);
    const joined = joinShares(targets, records);
    for (const name of files) rmSync(join(dir, name));
    return joined;
}
