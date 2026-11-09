// @vitest-environment node
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { joinShareFiles, joinShares, parseShare, shareOf, writeShareRecords } from './shards';
import type { CaptureRecord, CaptureTarget } from './types';

const target = (id: string): CaptureTarget => ({ id, storyId: id, title: 'Title', name: id, locale: 'en', width: 'mobile' });
const record = (id: string): CaptureRecord => ({ ...target(id), status: 'ok', hash: `hash-${id}`, error: null });

describe('parseShare', () => {
    it('reads an index and a total', () => {
        expect(parseShare('0/6')).toEqual({ index: 0, total: 6 });
        expect(parseShare('5/6')).toEqual({ index: 5, total: 6 });
    });

    it.each(['6/6', '1', 'a/6', '-1/6', '0/0', '1/6/2', ''])('rejects %j', (value) => {
        expect(() => parseShare(value)).toThrow('Expected a share like 0/6');
    });
});

describe('shareOf', () => {
    const items = Array.from({ length: 14 }, (_, position) => position);
    const allShares = (total: number) => Array.from({ length: total }, (_, index) => shareOf(items, { index, total }));

    it('deals items out by position', () => {
        expect(shareOf(items, { index: 0, total: 6 })).toEqual([0, 6, 12]);
        expect(shareOf(items, { index: 5, total: 6 })).toEqual([5, 11]);
    });

    it('gives every item to exactly one share', () => {
        expect(
            allShares(6)
                .flat()
                .sort((a, b) => a - b),
        ).toEqual(items);
    });

    it('keeps shares within one item of each other', () => {
        const sizes = allShares(6).map((share) => share.length);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    });

    it('gives everything to a single share', () => {
        expect(shareOf(items, { index: 0, total: 1 })).toEqual(items);
    });
});

describe('joinShares', () => {
    const targets = ['a', 'b', 'c'].map(target);

    it('returns the records in story-list order', () => {
        expect(joinShares(targets, [record('c'), record('a'), record('b')]).map((item) => item.id)).toEqual(['a', 'b', 'c']);
    });

    it('stops when a capture is missing', () => {
        expect(() => joinShares(targets, [record('a'), record('c')])).toThrow('Missing 1 of 3 captures, first: b');
    });

    it('stops when a capture came back twice', () => {
        expect(() => joinShares(targets, [record('a'), record('b'), record('b'), record('c')])).toThrow('Captured twice: b');
    });

    it('stops when a capture is not in the story list', () => {
        expect(() => joinShares(targets, ['a', 'b', 'c', 'd'].map(record))).toThrow('Captured but not in the story list: d');
    });

    it('accepts an empty story list with no records', () => {
        expect(joinShares([], [])).toEqual([]);
    });
});

describe('share files', () => {
    let dir = '';
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it('joins every share in a folder and removes their files', () => {
        dir = mkdtempSync(join(tmpdir(), 'shares-'));
        writeShareRecords(dir, 1, [record('b')]);
        writeShareRecords(dir, 0, [record('a'), record('c')]);
        writeFileSync(join(dir, 'a.png'), '');
        expect(joinShareFiles(dir, ['a', 'b', 'c'].map(target)).map((item) => item.id)).toEqual(['a', 'b', 'c']);
        expect(readdirSync(dir)).toEqual(['a.png']);
    });

    it('stops when a share never arrived', () => {
        dir = mkdtempSync(join(tmpdir(), 'shares-'));
        writeShareRecords(dir, 0, [record('a'), record('c')]);
        expect(() => joinShareFiles(dir, ['a', 'b', 'c'].map(target))).toThrow('Missing 1 of 3 captures, first: b');
        expect(existsSync(join(dir, 'records-0.json'))).toBe(true);
    });
});
