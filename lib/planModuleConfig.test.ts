import { describe, expect, it } from 'vitest';

import { PARTNER_ROLES } from '@/lib/adminPartnerBranding';
import type { PlanTierResponseDto } from '@/lib/api/types';
import {
    coHostCapacity,
    configChangeSummary,
    configSummary,
    describeConfigValue,
    fieldDraftFromValue,
    fieldValueFromDraft,
    formatConfigValue,
    isValidNumberDraft,
    knownConfigFields,
    knownDraftFromConfig,
    limitedKeysFromDraft,
    mergeConfigDraft,
    readableConfigChanges,
    splitConfig,
    splitStorageDraft,
    toggleTypeDraft,
    typesDraft,
    typesFromDraft,
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

describe('mergeConfigDraft', () => {
    it('drops blank known numbers and keeps booleans and unknown keys', () => {
        expect(mergeConfigDraft('schedule', { maxSections: '' }, { theme: 'dark' })).toEqual({ theme: 'dark' });
        expect(mergeConfigDraft('schedule', { maxSections: '5' }, {})).toEqual({ maxSections: 5 });
        expect(mergeConfigDraft('gallery', { qrUploadEnabled: 'false' }, {})).toEqual({ qrUploadEnabled: false });
    });
});

describe('vendors config fields', () => {
    const INT32_MAX = 2147483647;

    it('gives the plan grid a control for every vendors setting, with the server ranges', () => {
        expect(knownConfigFields('vendors')).toEqual([
            { key: 'maxVendors', type: 'number', min: 0, max: INT32_MAX, required: true },
            { key: 'allowedTypes', type: 'types' },
            { key: 'accessDaysAfterEvent', type: 'number', min: 0, max: INT32_MAX, required: true },
            { key: 'proStorageBytes', type: 'number', min: 0, max: Number.MAX_SAFE_INTEGER, required: true, storage: true },
        ]);
    });

    it('edits allowedTypes as a known setting, not JSON', () => {
        const { known, unknown } = splitConfig('vendors', { maxVendors: 5, allowedTypes: ['PLANNER'] });
        expect(known).toEqual({ maxVendors: 5, allowedTypes: ['PLANNER'] });
        expect(unknown).toEqual({});
        expect(knownDraftFromConfig('vendors', { allowedTypes: ['MUSIC', 'PLANNER'] }).allowedTypes).toBe('PLANNER,MUSIC');
    });

    it('keeps a key without a control as it is', () => {
        const config = { maxVendors: 5, accessDaysAfterEvent: 30, proStorageBytes: 1, allowedTypes: [], extraKey: { a: 1 } };
        const { unknown } = splitConfig('vendors', config);
        expect(mergeConfigDraft('vendors', knownDraftFromConfig('vendors', config), unknown, config)).toEqual(config);
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
        const draft = { maxVendors: '1', accessDaysAfterEvent: '1', proStorageBytes: '512 MB', allowedTypes: '' };
        expect(mergeConfigDraft('vendors', draft, {}).proStorageBytes).toBe(512 * 1024 ** 2);
    });

    it('keeps exact bytes when the rounded storage amount is untouched', () => {
        const config = { proStorageBytes: 1500000000 };
        const draft = knownDraftFromConfig('vendors', config);
        expect(draft.proStorageBytes).toBe('1.4 GB');
        expect(mergeConfigDraft('vendors', draft, {}, config).proStorageBytes).toBe(1500000000);
    });

    it('accepts a storage amount of 0 or more', () => {
        const field = knownConfigFields('vendors')[3] as Extract<ReturnType<typeof knownConfigFields>[number], { type: 'number' }>;
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
        type: (role: string) => `type:${role}`,
        allTypes: 'All',
        typeCount: (count: number, total: number) => `${count} of ${total}`,
    };

    it('describes counts and switches in words', () => {
        expect(readableConfigChanges('co_hosts', { maxCoHosts: 3 }, {}, labels)).toEqual([
            { key: 'field:maxCoHosts', before: 'Up to 3', after: 'Unlimited' },
        ]);
        expect(readableConfigChanges('member_roles', {}, { allowCustom: true }, labels)).toEqual([
            { key: 'field:allowCustom', before: 'Off', after: 'On' },
        ]);
    });

    it('describes storage in its unit, and a required number without "Up to"', () => {
        expect(readableConfigChanges('vendors', { proStorageBytes: 5368709120 }, { proStorageBytes: 1024 ** 4 }, labels)).toEqual([
            { key: 'field:proStorageBytes', before: '5 GB', after: '1 TB' },
        ]);
        expect(readableConfigChanges('vendors', { maxVendors: 5 }, { maxVendors: 1 }, labels)).toEqual([
            { key: 'field:maxVendors', before: '5', after: '1' },
        ]);
    });

    it('describes vendor types by name, All for every type and None for none', () => {
        const all = ['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DECORATION', 'CATERING', 'MUSIC', 'OTHER'];
        expect(readableConfigChanges('vendors', { allowedTypes: all }, { allowedTypes: ['MUSIC', 'PLANNER'] }, labels)).toEqual([
            { key: 'field:allowedTypes', before: 'All', after: 'type:PLANNER, type:MUSIC' },
        ]);
        expect(readableConfigChanges('vendors', { allowedTypes: ['PLANNER'] }, { allowedTypes: [] }, labels)).toEqual([
            { key: 'field:allowedTypes', before: 'type:PLANNER', after: 'None' },
        ]);
    });

    it('counts the same types in another order as no change', () => {
        expect(readableConfigChanges('vendors', { allowedTypes: ['MUSIC', 'PLANNER'] }, { allowedTypes: ['PLANNER', 'MUSIC'] }, labels)).toEqual([]);
    });

    it('sums up a grid cell in words, known settings in field order', () => {
        expect(
            configSummary(
                'vendors',
                { proStorageBytes: 5368709120, allowedTypes: ['VENUE'], maxVendors: 5, accessDaysAfterEvent: 30, other: 1 },
                labels,
            ),
        ).toEqual([
            { key: 'maxVendors', label: 'field:maxVendors', value: '5' },
            { key: 'allowedTypes', label: 'field:allowedTypes', value: 'type:VENUE' },
            { key: 'accessDaysAfterEvent', label: 'field:accessDaysAfterEvent', value: '30' },
            { key: 'proStorageBytes', label: 'field:proStorageBytes', value: '5 GB' },
            { key: 'other', label: 'other', value: '1' },
        ]);
        expect(configSummary('co_hosts', {}, labels)).toEqual([]);
    });

    it('counts a long list of types in a grid cell', () => {
        const value = (allowedTypes: string[]) => configSummary('vendors', { allowedTypes }, labels)[0].value;
        expect(value(['VENUE', 'MUSIC'])).toBe('type:VENUE, type:MUSIC');
        expect(value(['VENUE', 'MUSIC', 'PLANNER'])).toMatch(/^3 of \d+$/);
        expect(value([...PARTNER_ROLES])).toBe('All');
    });

    it('keeps raw keys and JSON for unknown settings', () => {
        expect(readableConfigChanges('posts', {}, { theme: 'dark' }, labels)).toEqual([{ key: 'theme', before: 'None', after: '"dark"' }]);
    });
});

describe('vendor types drafts', () => {
    const types = knownConfigFields('vendors')[1];

    it('keeps the picked types in the fixed order and drops unknown ones', () => {
        expect(typesDraft(['MUSIC', 'JUGGLER', 'PLANNER'])).toBe('PLANNER,MUSIC');
        expect(typesDraft(undefined)).toBe('');
        expect(typesFromDraft('MUSIC,PLANNER')).toEqual(['PLANNER', 'MUSIC']);
        expect(typesFromDraft('')).toEqual([]);
    });

    it('ticks and unticks one type', () => {
        expect(toggleTypeDraft('PLANNER', 'MUSIC', true)).toBe('PLANNER,MUSIC');
        expect(toggleTypeDraft('PLANNER,MUSIC', 'PLANNER', false)).toBe('MUSIC');
        expect(toggleTypeDraft('', 'VENUE', true)).toBe('VENUE');
        expect(toggleTypeDraft('VENUE', 'VENUE', true)).toBe('VENUE');
    });

    it('turns a draft back into a list, keeping the saved order when nothing changed', () => {
        expect(fieldValueFromDraft(types, 'MUSIC,PLANNER', ['MUSIC', 'PLANNER'])).toEqual(['PLANNER', 'MUSIC']);
        expect(fieldValueFromDraft(types, 'PLANNER,MUSIC', ['MUSIC', 'PLANNER'])).toEqual(['MUSIC', 'PLANNER']);
        expect(fieldValueFromDraft(types, 'VENUE', ['MUSIC'])).toEqual(['VENUE']);
        expect(fieldValueFromDraft(types, '', ['MUSIC'])).toEqual([]);
        expect(fieldValueFromDraft(types, undefined, ['MUSIC'])).toBeUndefined();
        expect(fieldDraftFromValue(types, ['OTHER', 'VENUE'])).toBe('VENUE,OTHER');
    });

    it('describes types, a required number and an unset one', () => {
        const labels = {
            field: (key: string) => key,
            unlimited: 'Unlimited',
            upTo: (count: number | string) => `Up to ${count}`,
            on: 'On',
            off: 'Off',
            none: 'None',
            type: (role: string) => role,
            allTypes: 'All',
            typeCount: (count: number, total: number) => `${count} of ${total}`,
        };
        expect(describeConfigValue(types, null, labels)).toBe('None');
        expect(describeConfigValue(knownConfigFields('vendors')[0], 0, labels)).toBe('0');
        expect(describeConfigValue(knownConfigFields('vendors')[0], null, labels)).toBe('None');
        expect(describeConfigValue(knownConfigFields('co_hosts')[0], null, labels)).toBe('Unlimited');
        expect(describeConfigValue(knownConfigFields('co_hosts')[0], 2, labels)).toBe('Up to 2');
    });
});
