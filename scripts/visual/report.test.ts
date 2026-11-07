// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_RETAKEN_CAPTURES, RETAKES } from './config';
import { decodePng, hashRaw } from './images';
import { buildReport } from './report';
import type { CaptureRecord, CaptureTarget, Manifest } from './types';

const solid = (gray: number) =>
    sharp({ create: { width: 20, height: 20, channels: 4, background: { r: gray, g: gray, b: gray, alpha: 1 } } })
        .png()
        .toBuffer();

const target = (id: string): CaptureTarget => ({ id, storyId: id, title: 'UI/Button', name: id, locale: 'en', width: 'mobile' });

describe('buildReport', () => {
    let root: string;
    let baseDir: string;
    let headDir: string;
    let reportDir: string;

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'visual-report-'));
        baseDir = join(root, 'base');
        headDir = join(root, 'head');
        reportDir = join(root, 'report');
        mkdirSync(baseDir);
        mkdirSync(headDir);
    });

    afterEach(() => rmSync(root, { recursive: true, force: true }));

    async function record(dir: string, id: string, gray: number): Promise<CaptureRecord> {
        const png = await solid(gray);
        writeFileSync(join(dir, `${id}.png`), png);
        return { ...target(id), status: 'ok', hash: hashRaw(await decodePng(png)), error: null };
    }

    const noRetake = () => Promise.reject(new Error('no retake expected'));

    const run = (baseRecords: CaptureRecord[], headRecords: CaptureRecord[], retake: (t: CaptureTarget) => Promise<CaptureRecord> = noRetake) =>
        buildReport({
            baseDir,
            headDir,
            reportDir,
            baseRecords,
            headRecords,
            baseSha: 'b',
            headSha: 'h',
            missingStories: ['components/x/Y.tsx'],
            retake,
        });

    it('leaves unchanged captures out of the report', async () => {
        const manifest = await run([await record(baseDir, 'a', 10)], [await record(headDir, 'a', 10)]);
        expect(manifest.entries).toEqual([]);
        expect(manifest.counts).toEqual({ changed: 0, new: 0, removed: 0, failed: 0 });
        expect(manifest.totalCaptures).toBe(1);
    });

    it('reports a changed capture with before, after, diff and preview images', async () => {
        const headRecord = await record(headDir, 'a', 200);
        const retake = vi.fn(async () => headRecord);
        const manifest = await run([await record(baseDir, 'a', 10)], [headRecord], retake);
        const [entry] = manifest.entries;
        expect(entry.state).toBe('changed');
        expect(entry.percent).toBe(100);
        expect(retake).toHaveBeenCalledTimes(2);
        for (const image of [entry.images.before, entry.images.after, entry.images.diff, entry.images.preview]) {
            expect(image).toMatch(/^img\/[0-9a-f]{16}-(before|after|diff|preview)\.webp$/);
            expect(existsSync(join(reportDir, image as string))).toBe(true);
        }
    });

    it('drops a difference that a retake clears', async () => {
        const baseRecord = await record(baseDir, 'a', 10);
        const flaky = await record(headDir, 'a', 200);
        const retake = vi.fn(async () => record(headDir, 'a', 10));
        const manifest = await run([baseRecord], [flaky], retake);
        expect(manifest.entries).toEqual([]);
        expect(retake).toHaveBeenCalledTimes(1);
    });

    it('reports a retake that fails as failed, with its error', async () => {
        const baseRecord = await record(baseDir, 'a', 10);
        const differs = await record(headDir, 'a', 200);
        const retake = vi.fn(async (t: CaptureTarget): Promise<CaptureRecord> => ({ ...t, status: 'failed', hash: null, error: 'Boom on retake' }));
        const manifest = await run([baseRecord], [differs], retake);
        expect(manifest.entries).toHaveLength(1);
        expect(manifest.entries[0].state).toBe('failed');
        expect(manifest.entries[0].error).toBe('Boom on retake');
        expect(manifest.counts.failed).toBe(1);
        expect(manifest.counts.changed).toBe(0);
    });

    it('stops retaking after the limit and still reports every change', async () => {
        const ids = Array.from({ length: MAX_RETAKEN_CAPTURES + 2 }, (_, index) => `story-${index}`);
        const baseRecords = await Promise.all(ids.map((id) => record(baseDir, id, 10)));
        const headRecords = await Promise.all(ids.map((id) => record(headDir, id, 200)));
        const retake = vi.fn(async (t: CaptureTarget) => headRecords.find((item) => item.id === t.id) as CaptureRecord);
        const manifest = await run(baseRecords, headRecords, retake);
        expect(manifest.counts.changed).toBe(ids.length);
        expect(retake).toHaveBeenCalledTimes(MAX_RETAKEN_CAPTURES * RETAKES);
    });

    it('reports new, removed and failed captures', async () => {
        const failed: CaptureRecord = { ...target('c'), status: 'failed', hash: null, error: 'Boom' };
        const manifest = await run([await record(baseDir, 'b', 10), await record(baseDir, 'c', 10)], [await record(headDir, 'a', 10), failed]);
        const states = Object.fromEntries(manifest.entries.map((entry) => [entry.id, entry.state]));
        expect(states).toEqual({ a: 'new', b: 'removed', c: 'failed' });
        expect(manifest.counts).toEqual({ changed: 0, new: 1, removed: 1, failed: 1 });
        const failedEntry = manifest.entries.find((entry) => entry.id === 'c');
        expect(failedEntry?.error).toBe('Boom');
        expect(failedEntry?.images).toEqual({});
    });

    it('treats a story that failed on the base as new', async () => {
        const baseFailed: CaptureRecord = { ...target('a'), status: 'failed', hash: null, error: 'Boom' };
        const manifest = await run([baseFailed], [await record(headDir, 'a', 10)]);
        expect(manifest.entries[0].state).toBe('new');
    });

    it('writes manifest.json with the fingerprint and missing stories', async () => {
        const manifest = await run([], [await record(headDir, 'a', 10)]);
        const written = JSON.parse(readFileSync(join(reportDir, 'manifest.json'), 'utf8')) as Manifest;
        expect(written.fingerprint).toBe(manifest.fingerprint);
        expect(written.fingerprint).toMatch(/^[0-9a-f]{64}$/);
        expect(written.missingStories).toEqual(['components/x/Y.tsx']);
    });
});
