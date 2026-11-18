// @vitest-environment node
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { decodePng, hashRaw } from './images';
import { buildReport, compareCaptures } from './report';
import { shareIdsToCompare } from './sharePlan';
import { joinShareReports, writeShareReport } from './shareReport';
import type { CaptureRecord, CaptureTarget } from './types';

const solid = (gray: number) =>
    sharp({ create: { width: 20, height: 20, channels: 4, background: { r: gray, g: gray, b: gray, alpha: 1 } } })
        .png()
        .toBuffer();

const target = (id: string): CaptureTarget => ({ id, storyId: id, title: 'UI/Button', name: id, locale: 'en', width: 'mobile' });

describe('joinShareReports', () => {
    let root: string;
    let baseDir: string;
    let headDir: string;
    let singleDir: string;
    let sharesDir: string;
    let baseRecords: CaptureRecord[];
    let headRecords: CaptureRecord[];

    async function record(dir: string, id: string, gray: number): Promise<CaptureRecord> {
        const png = await solid(gray);
        writeFileSync(join(dir, `${id}.png`), png);
        return { ...target(id), status: 'ok', hash: hashRaw(await decodePng(png)), error: null };
    }

    // Every retake gives the same head shot, like a real change.
    const retake = async (t: CaptureTarget) => headRecords.find((item) => item.id === t.id) as CaptureRecord;
    const targets = () => headRecords.map((item) => target(item.id));
    const shas = { baseSha: 'b', headSha: 'h', missingStories: [], total: 2 };

    // a and b get the same change and land in different shares; fresh is new, gone is removed, same is unchanged.
    beforeEach(async () => {
        root = mkdtempSync(join(tmpdir(), 'visual-share-report-'));
        [baseDir, headDir, singleDir, sharesDir] = ['base', 'head', 'single', 'shares'].map((name) => join(root, name));
        for (const dir of [baseDir, headDir, singleDir, sharesDir]) mkdirSync(dir);
        baseRecords = [
            await record(baseDir, 'a', 10),
            await record(baseDir, 'b', 10),
            await record(baseDir, 'gone', 90),
            await record(baseDir, 'same', 50),
        ];
        headRecords = [
            await record(headDir, 'a', 200),
            await record(headDir, 'b', 200),
            await record(headDir, 'fresh', 120),
            await record(headDir, 'same', 50),
        ];
    });

    afterEach(() => rmSync(root, { recursive: true, force: true }));

    // Compares base ids and head ids separately: the base-only capture is in the base list of share 0 only.
    async function writeShare(index: number, ids: string[], baseIds = ids) {
        const shareHead = headRecords.filter((item) => ids.includes(item.id));
        const comparison = await compareCaptures({
            baseDir,
            headDir,
            reportDir: sharesDir,
            baseRecords: baseRecords.filter((item) => baseIds.includes(item.id)),
            headRecords: shareHead,
            retake,
        });
        writeShareReport(sharesDir, index, { ...comparison, headRecords: shareHead });
    }

    it('joins share reports into the same manifest a single job writes', async () => {
        const single = await buildReport({ baseDir, headDir, reportDir: singleDir, baseRecords, headRecords, ...shas, retake });
        const plan = {
            total: 2,
            shares: [
                ['a', 'same'],
                ['b', 'fresh'],
            ],
        };
        for (const index of [0, 1]) {
            await writeShare(index, plan.shares[index], [
                ...shareIdsToCompare(
                    plan,
                    baseRecords.map((r) => r.id),
                    index,
                ),
            ]);
        }

        const { manifest, headRecords: joinedHead } = joinShareReports(sharesDir, targets(), shas);

        expect(manifest).toEqual(single);
        expect(manifest.groups).toHaveLength(1);
        const keys = Object.fromEntries(manifest.entries.map((entry) => [entry.id, entry.changeKey]));
        expect(keys).toEqual({ a: 'color-1', b: 'color-1', fresh: null, gone: null });
        expect(joinedHead.map((item) => item.id)).toEqual(['a', 'b', 'fresh', 'same']);
        expect(readdirSync(sharesDir).filter((name) => name.startsWith('share-'))).toEqual([]);
    });

    it('stops when a share report is missing', async () => {
        await writeShare(0, ['a', 'gone', 'same']);
        await writeShare(1, ['b']);
        expect(() => joinShareReports(sharesDir, targets(), shas)).toThrow('Missing 1 of 4 captures');
    });

    it('stops when the last share has no report, even if every head capture is covered', async () => {
        // A removal lives only in share 0's file, so a lost file could hide one.
        await writeShare(0, ['a', 'b', 'fresh', 'gone', 'same'], ['a', 'b', 'fresh', 'gone', 'same']);
        expect(() => joinShareReports(sharesDir, targets(), shas)).toThrow('No report from share 2 of 2');
    });

    it('stops when share 0 has no report', async () => {
        await writeShare(1, ['a', 'b', 'fresh', 'same']);
        expect(() => joinShareReports(sharesDir, targets(), shas)).toThrow('No report from share 1 of 2');
    });

    it('stops on a share report beyond the total', async () => {
        await writeShare(0, ['a', 'b', 'fresh', 'gone', 'same']);
        await writeShare(1, []);
        await writeShare(2, []);
        expect(() => joinShareReports(sharesDir, targets(), shas)).toThrow('Unexpected share report: share-2.json');
    });

    it('stops when two shares report the same capture', async () => {
        await writeShare(0, ['a', 'b', 'fresh', 'gone', 'same']);
        await writeShare(1, ['a']);
        expect(() => joinShareReports(sharesDir, targets(), shas)).toThrow('Captured twice: a');
    });

    it('stops on a capture the story list does not have', async () => {
        await writeShare(0, ['a', 'b', 'fresh', 'gone', 'same']);
        await writeShare(1, []);
        expect(() => joinShareReports(sharesDir, targets().slice(1), shas)).toThrow('Captured but not in the story list: a');
    });

    it('stops when there are no share reports', () => {
        expect(() => joinShareReports(sharesDir, targets(), shas)).toThrow('No report from share 1 of 2');
    });
});
