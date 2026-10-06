import { describe, expect, it } from 'vitest';

import type { PlanTierResponseDto } from '@/lib/api/types';
import {
    coHostCapacity,
    configChangeSummary,
    formatConfigValue,
    knownConfigFields,
    limitedKeysFromDraft,
    mergeConfigDraft,
    parseConfigJson,
    readableConfigChanges,
    splitConfig,
} from '@/lib/planModuleConfig';

describe('knownConfigFields', () => {
    it('returns typed fields for documented modules', () => {
        expect(knownConfigFields('schedule')).toEqual([{ key: 'maxSections', type: 'number', min: 1 }]);
        expect(knownConfigFields('gallery')).toEqual([
            { key: 'qrUploadEnabled', type: 'boolean' },
            { key: 'memberArchiveAfterEnd', type: 'boolean', hint: true },
        ]);
        expect(knownConfigFields('member_roles')).toEqual([{ key: 'allowCustom', type: 'boolean', hint: true }]);
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

describe('coHostCapacity', () => {
    const hosts = [{ displayOrder: 0 }, { displayOrder: 1 }, { displayOrder: 2 }];
    const planWith = (moduleConfigs: PlanTierResponseDto['moduleConfigs']) => ({ moduleConfigs }) as PlanTierResponseDto;

    it('counts co-hosts but not the primary host', () => {
        expect(coHostCapacity(hosts, planWith({ co_hosts: { maxCoHosts: 3 } }))).toEqual({ used: 2, limit: 3, isFull: false });
    });

    it('is full once the cap is reached', () => {
        expect(coHostCapacity(hosts, planWith({ co_hosts: { maxCoHosts: 2 } })).isFull).toBe(true);
        expect(coHostCapacity([{ displayOrder: 0 }], planWith({ co_hosts: { maxCoHosts: 0 } })).isFull).toBe(true);
    });

    it('has no cap when the key is absent or the plan is unknown', () => {
        expect(coHostCapacity(hosts, planWith({ co_hosts: {} }))).toEqual({ used: 2, limit: null, isFull: false });
        expect(coHostCapacity(hosts, undefined).limit).toBeNull();
    });
});

describe('mergeConfigDraft switches', () => {
    it('leaves an untouched missing switch out of the config', () => {
        expect(mergeConfigDraft('member_roles', { allowCustom: '' }, {})).toEqual({});
    });

    it('writes a touched switch', () => {
        expect(mergeConfigDraft('member_roles', { allowCustom: 'false' }, {})).toEqual({ allowCustom: false });
    });
});

describe('limitedKeysFromDraft', () => {
    it('lists count fields that hold a value', () => {
        expect(limitedKeysFromDraft('co_hosts', { maxCoHosts: '0' })).toEqual(['maxCoHosts']);
        expect(limitedKeysFromDraft('co_hosts', { maxCoHosts: '' })).toEqual([]);
    });
});

describe('readableConfigChanges', () => {
    const labels = {
        field: (key: string) => `field:${key}`,
        unlimited: 'Unlimited',
        upTo: (count: number) => `Up to ${count}`,
        on: 'On',
        off: 'Off',
        none: 'None',
    };

    it('describes counts and switches in words', () => {
        expect(readableConfigChanges('co_hosts', { maxCoHosts: 3 }, {}, labels)).toEqual([{ key: 'field:maxCoHosts', before: 'Up to 3', after: 'Unlimited' }]);
        expect(readableConfigChanges('member_roles', {}, { allowCustom: true }, labels)).toEqual([{ key: 'field:allowCustom', before: 'Off', after: 'On' }]);
    });

    it('keeps raw keys and JSON for unknown settings', () => {
        expect(readableConfigChanges('posts', {}, { theme: 'dark' }, labels)).toEqual([{ key: 'theme', before: 'None', after: '"dark"' }]);
    });
});
