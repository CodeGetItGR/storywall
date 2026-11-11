import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { comparePngs, type ImageDiff, isChanged } from './compare';
import { CONCURRENCY, MAX_RETAKEN_CAPTURES, RETAKES } from './config';
import { fingerprint } from './fingerprint';
import { decodePng, diffImage, makePreview, rawToWebp } from './images';
import { runPool } from './pool';
import { changeSignature, groupChanges, type SignedCapture } from './sameChange';
import type { CaptureRecord, CaptureState, CaptureTarget, Manifest, ReportEntry } from './types';

type ImageKind = keyof ReportEntry['images'];

// Captures a story's base version again on this machine, writing the PNG into `dir`.
export type BaseRecheck = { dir: string; retake: (target: CaptureTarget) => Promise<CaptureRecord> };

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
    // Without it, a capture that still differs after its retakes is reported as it is.
    baseRecheck?: BaseRecheck;
};

const pngPath = (dir: string, id: string) => join(dir, `${id}.png`);

const targetOf = ({ id, storyId, title, name, locale, width }: CaptureTarget): CaptureTarget => ({ id, storyId, title, name, locale, width });

export async function buildReport(input: BuildReportInput): Promise<Manifest> {
    const { baseDir, headDir, reportDir, baseRecords, headRecords, baseSha, headSha, missingStories, retake, baseRecheck } = input;
    mkdirSync(join(reportDir, 'img'), { recursive: true });
    let retakesLeft = MAX_RETAKEN_CAPTURES;
    const signatures: SignedCapture[] = [];

    function writeImage(id: string, kind: ImageKind, webp: Buffer): string {
        const name = `${createHash('sha1').update(id).digest('hex').slice(0, 16)}-${kind}.webp`;
        writeFileSync(join(reportDir, 'img', name), webp);
        return `img/${name}`;
    }

    const failedEntry = (record: CaptureRecord, base: CaptureRecord | undefined): ReportEntry => ({
        ...targetOf(record),
        state: 'failed',
        beforeHash: base?.hash ?? null,
        afterHash: null,
        percent: 0,
        error: record.error,
        changeKey: null,
        images: {},
    });

    // A capture that differs is retaken, and counts as changed only if every attempt differs.
    // A retake that fails ends as failed, because the story is broken, not different.
    // One unit of the limit covers a capture's retakes and its base recheck together.
    async function compareWithRetakes(
        base: CaptureRecord,
        head: CaptureRecord,
    ): Promise<{ record: CaptureRecord; diff: ImageDiff } | CaptureRecord | null> {
        const before = readFileSync(pngPath(baseDir, base.id));
        let record = head;
        let diff = await comparePngs(before, readFileSync(pngPath(headDir, head.id)));
        if (!isChanged(diff)) return null;
        const attempts = retakesLeft > 0 ? RETAKES : 0;
        retakesLeft -= 1;
        for (let attempt = 0; attempt < attempts && isChanged(diff); attempt += 1) {
            const retaken = await retake(targetOf(head));
            if (retaken.status !== 'ok') return retaken;
            record = retaken;
            diff = await comparePngs(before, readFileSync(pngPath(headDir, head.id)));
        }
        if (!isChanged(diff)) {
            process.stdout.write(`Cleared by a retake: ${head.id}\n`);
            return null;
        }
        if (attempts === 0 || !baseRecheck) return { record, diff };
        return recheckBase(baseRecheck, base, record, diff);
    }

    // The base can come from another runner, and two runners can smooth edges differently.
    // Taking the base again here puts both sides on this machine, so only a real change is left.
    // A recheck that fails keeps the change against the saved base: it never hides one.
    async function recheckBase(
        { dir, retake: retakeBase }: BaseRecheck,
        base: CaptureRecord,
        record: CaptureRecord,
        diff: ImageDiff,
    ): Promise<{ record: CaptureRecord; diff: ImageDiff } | null> {
        const failed = (message: string) => {
            process.stdout.write(`Base recheck failed: ${base.id}: ${message}\n`);
            return { record, diff };
        };
        let fresh: CaptureRecord;
        let freshDiff: ImageDiff;
        try {
            fresh = await retakeBase(targetOf(base));
            if (fresh.status !== 'ok') return failed(fresh.error ?? 'unknown error');
            freshDiff = await comparePngs(readFileSync(pngPath(dir, base.id)), readFileSync(pngPath(headDir, record.id)));
        } catch (error) {
            return failed(error instanceof Error ? error.message : String(error));
        }
        if (isChanged(freshDiff)) return { record, diff: freshDiff };
        process.stdout.write(`Cleared by a base recheck: ${base.id} (base: ${base.machine ?? 'unknown'}, here: ${fresh.machine ?? 'unknown'})\n`);
        return null;
    }

    async function changedEntry(base: CaptureRecord, record: CaptureRecord, diff: ImageDiff): Promise<ReportEntry> {
        const signature = changeSignature(diff);
        if (signature) signatures.push({ id: record.id, signature });
        const diffRaw = diffImage(diff.before, diff.mask);
        return {
            ...targetOf(record),
            state: 'changed',
            beforeHash: base.hash,
            afterHash: record.hash,
            percent: diff.percent,
            error: null,
            changeKey: null,
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
            changeKey: null,
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
            return failedEntry(head, base);
        }
        if (!base || base.status === 'failed') return singleImageEntry(head, 'new', headDir);
        if (base.hash === head.hash) return null;
        const result = await compareWithRetakes(base, head);
        if (!result) return null;
        return 'diff' in result ? changedEntry(base, result.record, result.diff) : failedEntry(result, base);
    }

    const found = (await runPool(ids, CONCURRENCY, entryFor)).filter((entry) => entry !== null);
    const { groups, keys } = groupChanges(signatures);
    const entries = found.map((entry) => ({ ...entry, changeKey: keys.get(entry.id) ?? null }));

    const counts: Record<CaptureState, number> = { changed: 0, new: 0, removed: 0, failed: 0 };
    for (const entry of entries) counts[entry.state] += 1;

    const manifest: Manifest = {
        headSha,
        baseSha,
        totalCaptures: headRecords.length,
        counts,
        fingerprint: fingerprint(entries),
        entries,
        groups,
        missingStories,
    };
    writeFileSync(join(reportDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return manifest;
}
