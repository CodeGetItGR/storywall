import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { testEntry } from '../testing/fixture';
import { isMarked, marksKey, readMarks, withMarks, withoutMarks, writeMarks } from './marks';

const entry = testEntry('a');

describe('marks', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it('marks and unmarks', () => {
        const marked = withMarks(new Map(), [entry]);
        expect(isMarked(marked, entry)).toBe(true);
        expect(isMarked(withoutMarks(marked, [entry]), entry)).toBe(false);
    });

    it('survives a new commit when both hashes match', () => {
        expect(isMarked(withMarks(new Map(), [entry]), testEntry('a'))).toBe(true);
    });

    it('clears when a hash changes', () => {
        const marked = withMarks(new Map(), [entry]);
        expect(isMarked(marked, { ...entry, afterHash: 'new' })).toBe(false);
        expect(isMarked(marked, { ...entry, beforeHash: 'new' })).toBe(false);
    });

    it('keeps marks in storage, per PR', () => {
        const key = marksKey({ pull: { number: 263, url: 'x' } });
        expect(key).not.toBe(marksKey({ pull: { number: 264, url: 'x' } }));
        writeMarks(key, withMarks(new Map(), [entry]));
        expect(isMarked(readMarks(key), entry)).toBe(true);
    });

    it('has a key for a local run', () => {
        expect(marksKey({})).toBe('visual-report-marks-local');
    });

    it('ignores broken storage', () => {
        localStorage.setItem('k', 'not json');
        expect(readMarks('k').size).toBe(0);
        localStorage.setItem('k', '{"a":"b"}');
        expect(readMarks('k').size).toBe(0);
        localStorage.setItem('k', '[["a","b"],["c",1],"d"]');
        expect([...readMarks('k')]).toEqual([['a', 'b']]);
    });

    it('treats a hostile id as plain data', () => {
        const hostile = testEntry('__proto__');
        const key = 'k';
        writeMarks(key, withMarks(new Map(), [hostile]));
        expect(isMarked(readMarks(key), hostile)).toBe(true);
    });

    it('keeps working when storage is unavailable', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(readMarks('k').size).toBe(0);
        expect(() => writeMarks('k', new Map())).not.toThrow();
    });
});
