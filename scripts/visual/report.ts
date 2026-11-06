import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { comparePngs, type ImageDiff, isChanged } from './compare';
import { CONCURRENCY, MAX_RETAKEN_CAPTURES, RETAKES } from './config';
import { fingerprint } from './fingerprint';
import { decodePng, diffImage, makePreview, rawToWebp } from './images';
import { runPool } from './pool';
import type { CaptureRecord, CaptureState, CaptureTarget, Manifest, ReportEntry } from './types';

type ImageKind = keyof ReportEntry['images'];

type BuildReportInput = {
    baseDir: string;
    headDir: string;
    reportDir: string;
    baseRecords: CaptureRecord[];
    headRecords: CaptureRecord[];
    baseSha: string;
    headSha: string;
    missingStories: string[];
    retake: (target: CaptureTarget) => Promise<CaptureRecord>;
};

const pngPath = (dir: string, id: string) => join(dir, `${id}.png`);

const targetOf = ({ id, storyId, title, name, locale, width }: CaptureTarget): CaptureTarget => ({ id, storyId, title, name, locale, width });

export async function buildReport(input: BuildReportInput): Promise<Manifest> {
    const { baseDir, headDir, reportDir, baseRecords, headRecords, baseSha, headSha, missingStories, retake } = input;
    mkdirSync(join(reportDir, 'img'), { recursive: true });
    let retakesLeft = MAX_RETAKEN_CAPTURES;

    function writeImage(id: string, kind: ImageKind, webp: Buffer): string {
        const name = `${createHash('sha1').update(id).digest('hex').slice(0, 16)}-${kind}.webp`;
        writeFileSync(join(reportDir, 'img', name), webp);
        return `img/${name}`;
    }

    // A capture that differs is retaken, and counts as changed only if every attempt differs.
    async function compareWithRetakes(base: CaptureRecord, head: CaptureRecord): Promise<{ record: CaptureRecord; diff: ImageDiff } | null> {
        const before = readFileSync(pngPath(baseDir, base.id));
        let record = head;
        let diff = await comparePngs(before, readFileSync(pngPath(headDir, head.id)));
        if (!isChanged(diff)) return null;
        const attempts = retakesLeft > 0 ? RETAKES : 0;
        retakesLeft -= 1;
        for (let attempt = 0; attempt < attempts && isChanged(diff); attempt += 1) {
            const retaken = await retake(targetOf(head));
            if (retaken.status !== 'ok') continue;
            record = retaken;
            diff = await comparePngs(before, readFileSync(pngPath(headDir, head.id)));
        }
        return isChanged(diff) ? { record, diff } : null;
    }

    async function changedEntry(base: CaptureRecord, record: CaptureRecord, diff: ImageDiff): Promise<ReportEntry> {
        const diffRaw = diffImage(diff.before, diff.mask);
        return {
            ...targetOf(record),
            state: 'changed',
            beforeHash: base.hash,
            afterHash: record.hash,
            percent: diff.percent,
            error: null,
            images: {
                before: writeImage(record.id, 'before', await rawToWebp(diff.before)),
                after: writeImage(record.id, 'after', await rawToWebp(diff.after)),
                diff: writeImage(record.id, 'diff', await rawToWebp(diffRaw)),
                preview: writeImage(record.id, 'preview', await makePreview([diff.before, diff.after])),
            },
        };
    }

    async function singleImageEntry(record: CaptureRecord, state: 'new' | 'removed', dir: string): Promise<ReportEntry> {
        const raw = await decodePng(readFileSync(pngPath(dir, record.id)));
        const kind = state === 'new' ? 'after' : 'before';
        return {
            ...targetOf(record),
            state,
            beforeHash: state === 'removed' ? record.hash : null,
            afterHash: state === 'new' ? record.hash : null,
            percent: 100,
            error: null,
            images: {
                [kind]: writeImage(record.id, kind, await rawToWebp(raw)),
                preview: writeImage(record.id, 'preview', await makePreview([raw])),
            },
        };
    }

    const baseById = new Map(baseRecords.map((record) => [record.id, record]));
    const headById = new Map(headRecords.map((record) => [record.id, record]));
    const ids = [...new Set([...baseById.keys(), ...headById.keys()])].sort();

    async function entryFor(id: string): Promise<ReportEntry | null> {
        const base = baseById.get(id);
        const head = headById.get(id);
        if (!head) return base?.status === 'ok' ? singleImageEntry(base, 'removed', baseDir) : null;
        if (head.status === 'failed') {
            return { ...targetOf(head), state: 'failed', beforeHash: base?.hash ?? null, afterHash: null, percent: 0, error: head.error, images: {} };
        }
        if (!base || base.status === 'failed') return singleImageEntry(head, 'new', headDir);
        if (base.hash === head.hash) return null;
        const result = await compareWithRetakes(base, head);
        return result ? changedEntry(base, result.record, result.diff) : null;
    }

    const entries = (await runPool(ids, CONCURRENCY, entryFor)).filter((entry) => entry !== null);

    const counts: Record<CaptureState, number> = { changed: 0, new: 0, removed: 0, failed: 0 };
    for (const entry of entries) counts[entry.state] += 1;

    const manifest: Manifest = {
        headSha,
        baseSha,
        totalCaptures: headRecords.length,
        counts,
        fingerprint: fingerprint(entries),
        entries,
        missingStories,
    };
    writeFileSync(join(reportDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return manifest;
}
