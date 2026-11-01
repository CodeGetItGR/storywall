import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type EditableCell, usePlanModuleCellDraft } from '@/hooks/usePlanModuleCellDraft';
import type { PlanTierResponseDto } from '@/lib/api/types';

const apiPatch = vi.fn().mockResolvedValue({});
vi.mock('@/lib/api/client', () => ({ api: { patch: (...a: unknown[]) => apiPatch(...a), put: vi.fn() } }));
vi.mock('@refinedev/core', () => ({ useInvalidate: () => vi.fn().mockResolvedValue(undefined) }));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useAppConfig', async (importOriginal) => ({ ...(await importOriginal<object>()), invalidatePublicConfig: vi.fn() }));

const VENDORS_CONFIG = { maxVendors: 5, accessDaysAfterEvent: 30, proStorageBytes: 5368709120, allowedTypes: ['PLANNER', 'PHOTOGRAPHER', 'MUSIC'] };

const cell = { planId: 'p1', moduleKey: 'vendors', kind: 'included', config: VENDORS_CONFIG, seedConfig: VENDORS_CONFIG } as EditableCell;
const plan = { id: 'p1', name: 'Plus', moduleKeys: ['vendors'] } as PlanTierResponseDto;

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

async function saveAfter(edit: (draft: ReturnType<typeof usePlanModuleCellDraft>) => void) {
    apiPatch.mockClear();
    const { result } = renderHook(() => usePlanModuleCellDraft({ cell, plan, onSavedAction: vi.fn() }), { wrapper });
    act(() => edit(result.current));
    act(() => result.current.requestSave());
    await act(async () => {
        await result.current.confirmSave();
    });
    return result;
}

describe('usePlanModuleCellDraft with the vendors module', () => {
    it('sends all four keys when one number is edited', async () => {
        await saveAfter((draft) => draft.handleLimitValueChange('maxVendors', '8'));

        expect(apiPatch).toHaveBeenCalledTimes(1);
        const [path, body] = apiPatch.mock.calls[0] as [string, { defaultConfig: Record<string, unknown> }];
        expect(path).toBe('/api/admin/plan-tiers/p1/modules/vendors');
        expect(body.defaultConfig).toEqual({ ...VENDORS_CONFIG, maxVendors: 8 });
        expect(Object.keys(body.defaultConfig).sort()).toEqual(['accessDaysAfterEvent', 'allowedTypes', 'maxVendors', 'proStorageBytes']);
    });

    it('sends vendor types ticked and unticked together with the unchanged numbers', async () => {
        await saveAfter((draft) => {
            draft.handleTypeChange('allowedTypes', 'PLANNER', false);
        });
        let [, body] = apiPatch.mock.calls[0] as [string, { defaultConfig: Record<string, unknown> }];
        expect(body.defaultConfig).toEqual({ maxVendors: 5, accessDaysAfterEvent: 30, proStorageBytes: 5368709120, allowedTypes: ['PHOTOGRAPHER', 'MUSIC'] });

        await saveAfter((draft) => draft.handleTypeChange('allowedTypes', 'VENUE', true));
        [, body] = apiPatch.mock.calls[0] as [string, { defaultConfig: Record<string, unknown> }];
        expect(body.defaultConfig.allowedTypes).toEqual(['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'MUSIC']);
    });

    it('lists the types change in words before saving', () => {
        const { result } = renderHook(() => usePlanModuleCellDraft({ cell, plan, onSavedAction: vi.fn() }), { wrapper });
        act(() => result.current.handleTypeChange('allowedTypes', 'MUSIC', false));
        act(() => result.current.requestSave());
        expect(result.current.pending?.changes).toEqual([
            {
                key: 'plans.grid.cell.fields.allowedTypes',
                before: 'collaborations.feedCard.roles.PLANNER, collaborations.feedCard.roles.PHOTOGRAPHER, collaborations.feedCard.roles.MUSIC',
                after: 'collaborations.feedCard.roles.PLANNER, collaborations.feedCard.roles.PHOTOGRAPHER',
            },
        ]);
    });

    it('has nothing to save when a type is ticked and unticked again', () => {
        const { result } = renderHook(() => usePlanModuleCellDraft({ cell, plan, onSavedAction: vi.fn() }), { wrapper });
        act(() => result.current.handleTypeChange('allowedTypes', 'VENUE', true));
        expect(result.current.canSave).toBe(true);
        act(() => result.current.handleTypeChange('allowedTypes', 'VENUE', false));
        expect(result.current.canSave).toBe(false);
    });

    it('sends storage in bytes', async () => {
        await saveAfter((draft) => draft.handleLimitValueChange('proStorageBytes', '10 GB'));

        const [, body] = apiPatch.mock.calls[0] as [string, { defaultConfig: Record<string, unknown> }];
        expect(body.defaultConfig).toEqual({ ...VENDORS_CONFIG, proStorageBytes: 10 * 1024 ** 3 });
    });

    it('does not save a blank or out-of-range number', () => {
        const { result } = renderHook(() => usePlanModuleCellDraft({ cell, plan, onSavedAction: vi.fn() }), { wrapper });
        act(() => result.current.handleLimitValueChange('accessDaysAfterEvent', ''));
        expect(result.current.canSave).toBe(false);
        expect(result.current.fieldErrors.accessDaysAfterEvent).toBeTruthy();

        act(() => result.current.handleLimitValueChange('accessDaysAfterEvent', '2147483648'));
        expect(result.current.canSave).toBe(false);

        act(() => result.current.handleLimitValueChange('accessDaysAfterEvent', '0'));
        expect(result.current.canSave).toBe(true);
        expect(result.current.fieldErrors.accessDaysAfterEvent).toBeUndefined();
    });
});
