import { describe, expect, it } from 'vitest';

import type {
    EventTypeModuleResponseDto,
    PaidServiceResponseDto,
    PlanTierModuleConfigDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import { buildPlanModuleGrid } from '@/lib/planModuleGrid';

function plan(overrides: Partial<PlanTierResponseDto>): PlanTierResponseDto {
    return {
        id: 'p1',
        code: 'P1',
        scope: 'EVENT',
        name: 'Basic',
        description: null,
        sortOrder: 0,
        isDefault: false,
        isAssignable: true,
        isPublic: true,
        storageBytes: null,
        maxMembers: null,
        priceAmountMinor: null,
        priceCurrency: null,
        billingPeriod: null,
        discountPercent: null,
        discountLabel: null,
        discountStartsAt: null,
        discountEndsAt: null,
        moduleKeys: [],
        paidModules: null,
        eventTypeKey: 'WEDDING',
        sharedGroupKey: null,
        initialOptions: [],
        extensionOptions: [],
        ...overrides,
    };
}

const modules: PlatformModuleResponseDto[] = [
    { id: 'm2', moduleKey: 'schedule', name: 'Schedule', description: null, isEnabled: true, sortOrder: 1 },
    { id: 'm1', moduleKey: 'gallery', name: 'Gallery', description: null, isEnabled: true, sortOrder: 0 },
    { id: 'm3', moduleKey: 'wishlist', name: 'Wishlist', description: null, isEnabled: true, sortOrder: 2 },
];

const matrix: EventTypeModuleResponseDto[] = [
    {
        eventTypeKey: 'WEDDING',
        moduleKey: 'gallery',
        applicability: 'DEFAULT_ON',
        defaultConfig: { qrUploadEnabled: true },
        sortOrder: 0,
        includedInPlan: null,
    },
    {
        eventTypeKey: 'WEDDING',
        moduleKey: 'schedule',
        applicability: 'DEFAULT_OFF',
        defaultConfig: { maxSections: 3 },
        sortOrder: 1,
        includedInPlan: null,
    },
    { eventTypeKey: 'WEDDING', moduleKey: 'wishlist', applicability: 'UNSUPPORTED', defaultConfig: {}, sortOrder: 2, includedInPlan: null },
];

const basic = plan({ id: 'p1', code: 'BASIC', name: 'Basic', sortOrder: 0, moduleKeys: ['gallery'] });
const plus = plan({ id: 'p2', code: 'PLUS', name: 'Plus', sortOrder: 1, moduleKeys: ['gallery', 'schedule'] });

const configs = new Map<string, PlanTierModuleConfigDto[]>([
    [
        'p1',
        [
            { moduleKey: 'gallery', defaultConfig: { qrUploadEnabled: false } },
            { moduleKey: 'schedule', defaultConfig: { maxSections: 3 } },
        ],
    ],
    [
        'p2',
        [
            { moduleKey: 'gallery', defaultConfig: { qrUploadEnabled: true } },
            { moduleKey: 'schedule', defaultConfig: { maxSections: 10 } },
        ],
    ],
]);

const unlocks: PaidServiceResponseDto[] = [
    {
        id: 's1',
        code: 'SCHEDULE_UNLOCK',
        kind: 'MODULE_UNLOCK',
        name: 'Schedule unlock',
        description: null,
        sortOrder: 0,
        isAssignable: true,
        isPublic: true,
        priceAmountMinor: 1900,
        priceCurrency: 'EUR',
        billingPeriod: 'ONE_TIME',
        grantsStorageBytes: null,
        grantsModuleKey: 'schedule',
        planTierIds: [],
    },
];

describe('buildPlanModuleGrid', () => {
    it('orders rows by module sortOrder and columns by plan sortOrder', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [plus, basic], configsByPlanId: configs, unlocks });
        expect(grid.columns.map((column) => column.plan.code)).toEqual(['BASIC', 'PLUS']);
        expect(grid.rows.map((row) => row.moduleKey)).toEqual(['gallery', 'schedule', 'wishlist']);
    });

    it('marks unsupported rows and gives them no cell content', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [basic], configsByPlanId: configs, unlocks });
        const wishlist = grid.rows.find((row) => row.moduleKey === 'wishlist')!;
        expect(wishlist.applicability).toBe('UNSUPPORTED');
        expect(wishlist.cells[0]).toEqual({ planId: 'p1', moduleKey: 'wishlist', kind: 'unsupported' });
    });

    it('builds included cells with the plan config', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [basic, plus], configsByPlanId: configs, unlocks });
        const gallery = grid.rows.find((row) => row.moduleKey === 'gallery')!;
        expect(gallery.cells[0]).toEqual({
            planId: 'p1',
            moduleKey: 'gallery',
            kind: 'included',
            config: { qrUploadEnabled: false },
            seedConfig: { qrUploadEnabled: true },
        });
    });

    it('prices an excluded module when an unlock covers the plan', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [basic], configsByPlanId: configs, unlocks });
        const schedule = grid.rows.find((row) => row.moduleKey === 'schedule')!;
        expect(schedule.cells[0]).toEqual({
            planId: 'p1',
            moduleKey: 'schedule',
            kind: 'excluded',
            config: { maxSections: 3 },
            seedConfig: { maxSections: 3 },
            unlock: unlocks[0],
        });
    });

    it('uses the seed config when the plan has no config row yet', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [basic], configsByPlanId: new Map(), unlocks: [] });
        const gallery = grid.rows.find((row) => row.moduleKey === 'gallery')!;
        expect(gallery.cells[0]).toMatchObject({ kind: 'included', config: { qrUploadEnabled: true } });
    });

    it('counts supported and unsupported modules', () => {
        const grid = buildPlanModuleGrid({ modules, matrix, plans: [basic], configsByPlanId: configs, unlocks });
        expect(grid.supportedCount).toBe(2);
        expect(grid.unsupportedCount).toBe(1);
    });
});
