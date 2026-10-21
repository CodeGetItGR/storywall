import { describe, expect, it } from 'vitest';

import type { PlanTierResponseDto } from '@/lib/api/types';
import {
    coHostCapacity,
    configChangeSummary,
    formatConfigValue,
    isValidNumberDraft,
    knownConfigFields,
    knownDraftFromConfig,
    limitedKeysFromDraft,
    mergeConfigDraft,
    parseConfigJson,
    readableConfigChanges,
    splitConfig,
    splitStorageDraft,
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

describe('vendors config fields', () => {
    const INT32_MAX = 2147483647;

    it('gives the plan grid required number fields for the vendors module, with the server ranges', () => {
        expect(knownConfigFields('vendors')).toEqual([
            { key: 'maxVendors', type: 'number', min: 0, max: INT32_MAX, required: true },
            { key: 'accessDaysAfterEvent', type: 'number', min: 0, max: INT32_MAX, required: true },
            { key: 'proStorageBytes', type: 'number', min: 0, max: Number.MAX_SAFE_INTEGER, required: true, storage: true },
        ]);
    });

    it('leaves allowedTypes in the Advanced JSON', () => {
        const { known, unknown } = splitConfig('vendors', { maxVendors: 5, allowedTypes: ['PLANNER'] });
        expect(known).toEqual({ maxVendors: 5 });
        expect(unknown).toEqual({ allowedTypes: ['PLANNER'] });
    });

    it('keeps the whole map when one field is edited', () => {
        const config = { maxVendors: 5, accessDaysAfterEvent: 30, proStorageBytes: 5368709120, allowedTypes: ['PLANNER', 'MUSIC'] };
        const { unknown } = splitConfig('vendors', config);
        const draft = { ...knownDraftFromConfig('vendors', config), maxVendors: '8' };
        expect(mergeConfigDraft('vendors', draft, unknown)).toEqual({ ...config, maxVendors: 8 });
    });

    it('edits storage as an amount and a unit', () => {
        expect(knownDraftFromConfig('vendors', { proStorageBytes: 5368709120 }).proStorageBytes).toBe('5 GB');
        expect(splitStorageDraft('5 GB')).toEqual({ amount: '5', unit: 'GB' });
        expect(splitStorageDraft(' TB')).toEqual({ amount: '', unit: 'TB' });
        const draft = { maxVendors: '1', accessDaysAfterEvent: '1', proStorageBytes: '512 MB' };
        expect(mergeConfigDraft('vendors', draft, { allowedTypes: [] }).proStorageBytes).toBe(512 * 1024 ** 2);
    });

    it('keeps exact bytes when the rounded storage amount is untouched', () => {
        const config = { proStorageBytes: 1500000000 };
        const draft = knownDraftFromConfig('vendors', config);
        expect(draft.proStorageBytes).toBe('1.4 GB');
        expect(mergeConfigDraft('vendors', draft, {}, config).proStorageBytes).toBe(1500000000);
    });

    it('accepts a storage amount of 0 or more', () => {
        const field = knownConfigFields('vendors')[2] as Extract<ReturnType<typeof knownConfigFields>[number], { type: 'number' }>;
        expect(isValidNumberDraft(field, '0 MB')).toBe(true);
        expect(isValidNumberDraft(field, '1.5 GB')).toBe(true);
        expect(isValidNumberDraft(field, ' GB')).toBe(false);
        expect(isValidNumberDraft(field, '-1 GB')).toBe(false);
    });
});

describe('isValidNumberDraft', () => {
    const maxVendors = { key: 'maxVendors', type: 'number', min: 0, max: 2147483647, required: true } as const;

    it('accepts whole numbers inside the range, zero included', () => {
        expect(isValidNumberDraft(maxVendors, '0')).toBe(true);
        expect(isValidNumberDraft(maxVendors, ' 2147483647 ')).toBe(true);
    });

    it('refuses blanks, decimals, negatives and numbers above the maximum', () => {
        expect(isValidNumberDraft(maxVendors, '')).toBe(false);
        expect(isValidNumberDraft(maxVendors, '1.5')).toBe(false);
        expect(isValidNumberDraft(maxVendors, '-1')).toBe(false);
        expect(isValidNumberDraft(maxVendors, '2147483648')).toBe(false);
        expect(isValidNumberDraft(maxVendors, 'abc')).toBe(false);
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

    it("prefers the event's own cap, which has an admin's extra", () => {
        const modules = [{ moduleKey: 'co_hosts', configuration: { maxCoHosts: 5 } }];
        expect(coHostCapacity(hosts, planWith({ co_hosts: { maxCoHosts: 2 } }), modules).limit).toBe(5);
        expect(coHostCapacity(hosts, planWith({ co_hosts: { maxCoHosts: 2 } }), [{ moduleKey: 'co_hosts', configuration: {} }]).limit).toBeNull();
        expect(coHostCapacity(hosts, planWith({ co_hosts: { maxCoHosts: 2 } }), [{ moduleKey: 'co_hosts', configuration: null }]).limit).toBe(2);
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
        upTo: (count: number | string) => `Up to ${count}`,
        on: 'On',
        off: 'Off',
        none: 'None',
    };

    it('describes counts and switches in words', () => {
        expect(readableConfigChanges('co_hosts', { maxCoHosts: 3 }, {}, labels)).toEqual([
            { key: 'field:maxCoHosts', before: 'Up to 3', after: 'Unlimited' },
        ]);
        expect(readableConfigChanges('member_roles', {}, { allowCustom: true }, labels)).toEqual([
            { key: 'field:allowCustom', before: 'Off', after: 'On' },
        ]);
    });

    it('describes storage in its unit', () => {
        expect(readableConfigChanges('vendors', { proStorageBytes: 5368709120 }, { proStorageBytes: 1024 ** 4 }, labels)).toEqual([
            { key: 'field:proStorageBytes', before: 'Up to 5 GB', after: 'Up to 1 TB' },
        ]);
    });

    it('keeps raw keys and JSON for unknown settings', () => {
        expect(readableConfigChanges('posts', {}, { theme: 'dark' }, labels)).toEqual([{ key: 'theme', before: 'None', after: '"dark"' }]);
    });
});
