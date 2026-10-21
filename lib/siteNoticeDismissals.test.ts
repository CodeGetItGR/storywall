import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    addDismissal,
    DISMISSED_COOKIE,
    parseDismissals,
    readDismissalsCookie,
    subscribeDismissals,
    writeDismissalsCookie,
} from '@/lib/siteNoticeDismissals';

describe('site notice dismissals', () => {
    afterEach(() => {
        document.cookie = `${DISMISSED_COOKIE}=; Max-Age=0; Path=/`;
    });

    it('parses the cookie value into keys and ignores junk', () => {
        expect(parseDismissals('a:1.b:2')).toEqual(['a:1', 'b:2']);
        expect(parseDismissals('')).toEqual([]);
        expect(parseDismissals(undefined)).toEqual([]);
        expect(parseDismissals('a:1.nonsense.c:x')).toEqual(['a:1']);
    });

    it('adds a key once and keeps only the newest twenty', () => {
        expect(addDismissal('a:1', 'a:1')).toBe('a:1');
        let raw = '';
        for (let i = 0; i < 25; i += 1) raw = addDismissal(raw, `n${i}:1`);
        const keys = parseDismissals(raw);
        expect(keys).toHaveLength(20);
        expect(keys[0]).toBe('n5:1');
        expect(keys.at(-1)).toBe('n24:1');
    });

    it('writes and reads the cookie and tells subscribers', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeDismissals(listener);
        writeDismissalsCookie('a:1');
        expect(readDismissalsCookie()).toBe('a:1');
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
    });
});
