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
        expect(isMarked(withMarks(new Map(), [entry]), testEntry('a', { percent: 50, images: {} }))).toBe(true);
    });

    it('never counts a failed capture as reviewed', () => {
        const removed = testEntry('a', { state: 'removed', afterHash: null });
        expect(isMarked(withMarks(new Map(), [removed]), { ...removed, state: 'failed' })).toBe(false);
    });

    it('clears when a hash changes', () => {
        const marked = withMarks(new Map(), [entry]);
        expect(isMarked(marked, { ...entry, afterHash: 'new' })).toBe(false);
        expect(isMarked(marked, { ...entry, beforeHash: 'new' })).toBe(false);
    });

    it('keeps marks in storage, per PR and repo', () => {
        const key = marksKey({ pull: { number: 263, url: 'https://github.com/CodeGetItGR/storywall/pull/263' } });
        expect(key).not.toBe(marksKey({ pull: { number: 264, url: 'https://github.com/CodeGetItGR/storywall/pull/264' } }));
        expect(key).not.toBe(marksKey({ pull: { number: 263, url: 'https://github.com/CodeGetItGR/other/pull/263' } }));
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
        localStorage.setItem('k', '[["a","b"]]');
        expect(readMarks('k').size).toBe(0);
        localStorage.setItem('k', '{"savedAt":1,"marks":[["a","b"],["c",1],"d"]}');
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

    it('clears the marks saved longest ago when storage is full', () => {
        const marks = withMarks(new Map(), [entry]);
        writeMarks('visual-report-marks-newer', marks, 2);
        writeMarks('visual-report-marks-older', marks, 1);
        localStorage.setItem('other-site', 'kept');
        const setItem = Storage.prototype.setItem;
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name: string, value: string) {
            if (localStorage.getItem('visual-report-marks-older') !== null) throw new DOMException('Full', 'QuotaExceededError');
            setItem.call(this, name, value);
        });
        writeMarks('visual-report-marks-current', marks, 3);
        expect(localStorage.getItem('visual-report-marks-older')).toBeNull();
        expect(localStorage.getItem('visual-report-marks-newer')).not.toBeNull();
        expect(localStorage.getItem('other-site')).toBe('kept');
        expect(isMarked(readMarks('visual-report-marks-current'), entry)).toBe(true);
    });

    it("doesn't clear anything when saving fails for another reason", () => {
        writeMarks('visual-report-marks-older', withMarks(new Map(), [entry]), 1);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        writeMarks('visual-report-marks-current', new Map(), 2);
        expect(localStorage.getItem('visual-report-marks-older')).not.toBeNull();
    });

    it('stops when nothing is left to clear', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('Full', 'QuotaExceededError');
        });
        expect(() => writeMarks('visual-report-marks-current', new Map())).not.toThrow();
    });
});
