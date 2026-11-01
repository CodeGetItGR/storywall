import { describe, expect, it } from 'vitest';

import type { EventTypeModuleResponseDto, PlanTierModuleConfigDto } from '@/lib/api/types';
import { knownDraftFromConfig } from '@/lib/planModuleConfig';
import { planVendorsConfig, typeSupportsVendors, vendorSettingsChanges, vendorSettingsErrors } from '@/lib/provisionVendorSettings';

const PLAN_CONFIG = { maxVendors: 5, allowedTypes: ['PLANNER', 'MUSIC'], accessDaysAfterEvent: 30, proStorageBytes: 5368709120 };

function typeRow(moduleKey: string, applicability: string, defaultConfig: Record<string, unknown> = {}) {
    return { moduleKey, applicability, defaultConfig } as unknown as EventTypeModuleResponseDto;
}

function planRow(moduleKey: string, defaultConfig: Record<string, unknown>) {
    return { moduleKey, defaultConfig } as unknown as PlanTierModuleConfigDto;
}

describe('typeSupportsVendors', () => {
    it('is true when the type has a vendors row that is not unsupported', () => {
        expect(typeSupportsVendors([typeRow('vendors', 'INCLUDED')])).toBe(true);
        expect(typeSupportsVendors([typeRow('vendors', 'OPTIONAL')])).toBe(true);
    });

    it('is false without a row, when unsupported, or before the matrix loads', () => {
        expect(typeSupportsVendors([typeRow('vendors', 'UNSUPPORTED')])).toBe(false);
        expect(typeSupportsVendors([typeRow('gallery', 'INCLUDED')])).toBe(false);
        expect(typeSupportsVendors(undefined)).toBe(false);
    });
});

describe('planVendorsConfig', () => {
    it("uses the plan's config first, then the type's default", () => {
        const matrix = [typeRow('vendors', 'INCLUDED', { maxVendors: 3 })];
        expect(planVendorsConfig([planRow('vendors', PLAN_CONFIG)], matrix)).toEqual(PLAN_CONFIG);
        expect(planVendorsConfig([planRow('gallery', {})], matrix)).toEqual({ maxVendors: 3 });
        expect(planVendorsConfig(undefined, undefined)).toEqual({});
    });
});

describe('vendor settings drafts', () => {
    const draft = knownDraftFromConfig('vendors', PLAN_CONFIG);

    it('sends nothing when the draft is the plan', () => {
        expect(vendorSettingsErrors(draft)).toEqual([]);
        expect(vendorSettingsChanges(PLAN_CONFIG, draft)).toEqual([]);
    });

    it('sends only the settings that changed, as exact values', () => {
        expect(vendorSettingsChanges(PLAN_CONFIG, { ...draft, maxVendors: '1', allowedTypes: 'VENUE' })).toEqual([
            { moduleKey: 'vendors', configKey: 'maxVendors', value: 1 },
            { moduleKey: 'vendors', configKey: 'allowedTypes', value: ['VENUE'] },
        ]);
    });

    it('sends 0 vendors and no types, which are real choices', () => {
        expect(vendorSettingsChanges(PLAN_CONFIG, { ...draft, maxVendors: '0', allowedTypes: '' })).toEqual([
            { moduleKey: 'vendors', configKey: 'maxVendors', value: 0 },
            { moduleKey: 'vendors', configKey: 'allowedTypes', value: [] },
        ]);
    });

    it('sends storage in bytes', () => {
        expect(vendorSettingsChanges(PLAN_CONFIG, { ...draft, proStorageBytes: '1 GB' })).toEqual([
            { moduleKey: 'vendors', configKey: 'proStorageBytes', value: 1024 ** 3 },
        ]);
    });

    it('sends every setting when the plan has none', () => {
        const changes = vendorSettingsChanges({}, draft);
        expect(changes.map((change) => change.configKey)).toEqual(['maxVendors', 'allowedTypes', 'accessDaysAfterEvent', 'proStorageBytes']);
    });

    it('blocks numbers it cannot save', () => {
        expect(vendorSettingsErrors({ ...draft, maxVendors: '' })).toEqual(['maxVendors']);
        expect(vendorSettingsErrors({ ...draft, maxVendors: '-1', accessDaysAfterEvent: '1.5' })).toEqual(['maxVendors', 'accessDaysAfterEvent']);
        expect(vendorSettingsErrors({ ...draft, proStorageBytes: 'lots' })).toEqual(['proStorageBytes']);
    });
});
