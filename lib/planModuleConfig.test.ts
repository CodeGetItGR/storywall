import { describe, expect, it } from 'vitest';

import { configChangeSummary, formatConfigValue, knownConfigFields, mergeConfigDraft, parseConfigJson, splitConfig } from '@/lib/planModuleConfig';

describe('knownConfigFields', () => {
    it('returns typed fields for documented modules', () => {
        expect(knownConfigFields('schedule')).toEqual([{ key: 'maxSections', type: 'number', min: 1 }]);
        expect(knownConfigFields('gallery')).toEqual([{ key: 'qrUploadEnabled', type: 'boolean' }]);
    });

    it('returns nothing for an unknown module', () => {
        expect(knownConfigFields('posts')).toEqual([]);
    });
});

describe('splitConfig', () => {
    it('separates known keys from the rest', () => {
        const result = splitConfig('schedule', { maxSections: 3, theme: 'dark' });
        expect(result.known).toEqual({ maxSections: 3 });
        expect(result.unknown).toEqual({ theme: 'dark' });
    });
});

describe('parseConfigJson', () => {
    it('accepts an empty string as an empty object', () => {
        expect(parseConfigJson('')).toEqual({ ok: true, value: {} });
    });

    it('accepts a JSON object', () => {
        expect(parseConfigJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    });

    it('rejects non-objects and invalid JSON', () => {
        expect(parseConfigJson('[1]')).toEqual({ ok: false });
        expect(parseConfigJson('nope')).toEqual({ ok: false });
        expect(parseConfigJson('null')).toEqual({ ok: false });
    });
});

describe('mergeConfigDraft', () => {
    it('drops blank known numbers and keeps booleans and unknown keys', () => {
        expect(mergeConfigDraft('schedule', { maxSections: '' }, { theme: 'dark' })).toEqual({ theme: 'dark' });
        expect(mergeConfigDraft('schedule', { maxSections: '5' }, {})).toEqual({ maxSections: 5 });
        expect(mergeConfigDraft('gallery', { qrUploadEnabled: 'false' }, {})).toEqual({ qrUploadEnabled: false });
    });
});

describe('configChangeSummary', () => {
    it('lists changed, added and removed keys with before/after', () => {
        const changes = configChangeSummary({ maxSections: 3, old: true }, { maxSections: 5, fresh: 'x' }, 'None');
        expect(changes).toEqual([
            { key: 'maxSections', before: '3', after: '5' },
            { key: 'old', before: 'true', after: 'None' },
            { key: 'fresh', before: 'None', after: '"x"' },
        ]);
    });

    it('returns an empty list when nothing changed', () => {
        expect(configChangeSummary({ a: 1 }, { a: 1 }, 'None')).toEqual([]);
    });
});

describe('formatConfigValue', () => {
    it('formats primitives compactly and objects as JSON', () => {
        expect(formatConfigValue(3)).toBe('3');
        expect(formatConfigValue(true)).toBe('true');
        expect(formatConfigValue('x')).toBe('"x"');
        expect(formatConfigValue({ a: 1 })).toBe('{"a":1}');
    });
});
