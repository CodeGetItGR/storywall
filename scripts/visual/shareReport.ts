import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Comparison, finishReport } from './report';
import { joinShares } from './shards';
import type { CaptureRecord, CaptureTarget, Manifest } from './types';

// One share's compare: its entries and change signatures, and its head records so the join can check none is lost.
export type ShareReport = Comparison & { headRecords: CaptureRecord[] };

const SHARE_FILE = /^share-\d+\.json$/;

// Written next to the share's images, so downloading every share's report folder into one gives the whole report.
export function writeShareReport(dir: string, index: number, report: ShareReport) {
    writeFileSync(join(dir, `share-${index}.json`), JSON.stringify(report));
}

// Joins every share report in `dir` into manifest.json, then removes the share files.
// The head records must cover the story list exactly once, as in joinShares. A share compares only its own
// head records, so that also means no entry is reported twice. The joined head records feed the timings file.
export function joinShareReports(
    dir: string,
    targets: CaptureTarget[],
    { baseSha, headSha, missingStories }: { baseSha: string; headSha: string; missingStories: string[] },
): { manifest: Manifest; headRecords: CaptureRecord[] } {
    const files = existsSync(dir) ? readdirSync(dir).filter((name) => SHARE_FILE.test(name)) : [];
    if (files.length === 0) throw new Error(`No share reports in ${dir}`);
    const reports = files.map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as ShareReport);
    const headRecords = joinShares(
        targets,
        reports.flatMap((report) => report.headRecords),
    );
    const manifest = finishReport({
        reportDir: dir,
        entries: reports.flatMap((report) => report.entries),
        signatures: reports.flatMap((report) => report.signatures),
        baseSha,
        headSha,
        totalCaptures: headRecords.length,
        missingStories,
    });
    for (const name of files) rmSync(join(dir, name));
    return { manifest, headRecords };
}
