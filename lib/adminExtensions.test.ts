import { describe, expect, it } from 'vitest';

import { eventPlanFixture, extensionFixture } from '@/components/admin/__fixtures__/extensionPlans';
import {
    extensionDraftFromRow,
    extensionRowsFromPlans,
    extensionVisibility,
    filterExtensionRows,
    isExtensionDraftValid,
    newExtensionDraft,
    parseExtensionPrice,
} from '@/lib/adminExtensions';

const classic = eventPlanFixture({
    extensionOptions: [extensionFixture({ id: 'c-12', months: 12 }), extensionFixture({ id: 'c-3', months: 3, active: false })],
});
const premium = eventPlanFixture({ id: 'plan-premium', code: 'PREMIUM', name: 'Premium', extensionOptions: [extensionFixture({ id: 'p-6' })] });
const rows = extensionRowsFromPlans([classic, premium]);

describe('extensionRowsFromPlans', () => {
    it('lists every plan in order, each shortest first', () => {
        expect(rows.map((row) => row.option.id)).toEqual(['c-3', 'c-12', 'p-6']);
        expect(rows[2].plan.name).toBe('Premium');
    });
});

describe('extensionVisibility', () => {
    it('reads on sale as live and retired as archived', () => {
        expect(extensionVisibility(extensionFixture())).toBe('LIVE');
        expect(extensionVisibility(extensionFixture({ active: false }))).toBe('ARCHIVED');
    });
});

describe('filterExtensionRows', () => {
    it('hides extensions when another kind is picked', () => {
        expect(filterExtensionRows(rows, { kind: 'STORAGE_PACK', status: 'ALL', search: '' })).toEqual([]);
        expect(filterExtensionRows(rows, { kind: 'EXTENSION', status: 'ALL', search: '' })).toHaveLength(3);
        expect(filterExtensionRows(rows, { kind: 'ALL', status: 'ALL', search: '' })).toHaveLength(3);
    });

    it('filters by status', () => {
        expect(filterExtensionRows(rows, { kind: 'ALL', status: 'ARCHIVED', search: '' }).map((row) => row.option.id)).toEqual(['c-3']);
        expect(filterExtensionRows(rows, { kind: 'ALL', status: 'HIDDEN', search: '' })).toEqual([]);
    });

    it('searches the plan name, the plan code and the length', () => {
        expect(filterExtensionRows(rows, { kind: 'ALL', status: 'ALL', search: 'prem' }).map((row) => row.option.id)).toEqual(['p-6']);
        expect(filterExtensionRows(rows, { kind: 'ALL', status: 'ALL', search: 'classic' })).toHaveLength(2);
        expect(filterExtensionRows(rows, { kind: 'ALL', status: 'ALL', search: '12' }).map((row) => row.option.id)).toEqual(['c-12']);
    });
});

describe('extension drafts', () => {
    it('starts on the first plan, blank', () => {
        expect(newExtensionDraft([classic, premium])).toEqual({ planTierId: 'plan-classic', months: '', price: '' });
        expect(newExtensionDraft([])).toEqual({ planTierId: '', months: '', price: '' });
    });

    it('fills in from an extension', () => {
        expect(extensionDraftFromRow(rows[2])).toEqual({ planTierId: 'plan-premium', months: '6', price: '29' });
    });

    it('needs a plan, 1 to 120 months and a price above zero', () => {
        const valid = { planTierId: 'plan-classic', months: '6', price: '29' };
        expect(isExtensionDraftValid(valid)).toBe(true);
        expect(isExtensionDraftValid({ ...valid, planTierId: '' })).toBe(false);
        expect(isExtensionDraftValid({ ...valid, months: '0' })).toBe(false);
        expect(isExtensionDraftValid({ ...valid, months: '121' })).toBe(false);
        expect(isExtensionDraftValid({ ...valid, price: '0' })).toBe(false);
        expect(isExtensionDraftValid({ ...valid, price: '' })).toBe(false);
    });

    it('refuses a free price', () => {
        expect(parseExtensionPrice('0')).toBeNull();
        expect(parseExtensionPrice('0.01')).toBe(1);
        expect(parseExtensionPrice('19.90')).toBe(1_990);
    });
});
