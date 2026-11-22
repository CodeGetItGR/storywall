import { act, renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { eventPlanFixture, extensionFixture } from '@/components/admin/__fixtures__/extensionPlans';
import { useExtensionDrawer } from '@/hooks/useExtensionDrawer';
import { extensionRowsFromPlans } from '@/lib/adminExtensions';

const mocks = vi.hoisted(() => ({ create: vi.fn(), createAsync: vi.fn(), update: vi.fn() }));

function mutation(mutate: typeof mocks.create, mutateAsync = vi.fn()) {
    return { mutate, mutateAsync, reset: vi.fn(), isPending: false, error: null };
}

vi.mock('@/hooks/useAdminCoverageOptions', () => ({
    useCreateCoverageOption: () => mutation(mocks.create, mocks.createAsync),
    useUpdateCoverageOption: () => mutation(mocks.update),
}));

const plans = [
    eventPlanFixture({ extensionOptions: [extensionFixture({ id: 'ext-6', months: 6, priceAmountMinor: 2_900 })] }),
    eventPlanFixture({ id: 'plan-premium', name: 'Premium', extensionOptions: [] }),
    eventPlanFixture({ id: 'plan-baptism', code: 'CLASSIC_BAPTISM', eventTypeKey: 'BAPTISM', extensionOptions: [] }),
];

function change(name: string, value: string) {
    return { currentTarget: { name, value } } as unknown as React.ChangeEvent<HTMLInputElement>;
}

const submit = { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;

describe('useExtensionDrawer', () => {
    beforeEach(() => {
        mocks.create.mockReset();
        mocks.createAsync.mockReset();
        mocks.update.mockReset();
    });

    it('creates the same extension on every picked plan, priced above zero', async () => {
        mocks.createAsync.mockResolvedValue({});
        const { result } = renderHook(() => useExtensionDrawer(plans));
        act(() => result.current.openNew());
        expect(result.current.open).toBe(true);
        expect(result.current.editing).toBeNull();
        expect(result.current.draft.planTierIds).toEqual([]);

        act(() => result.current.togglePlan('plan-premium'));
        act(() => result.current.togglePlan('plan-baptism'));
        act(() => result.current.updateDraft(change('months', '12')));
        act(() => result.current.updateDraft(change('price', '0')));
        expect(result.current.canSave).toBe(false);

        act(() => result.current.updateDraft(change('price', '49.50')));
        expect(result.current.canSave).toBe(true);
        act(() => result.current.save(submit));

        const option = { kind: 'EXTENSION', months: 12, priceAmountMinor: 4_950, sortOrder: 0 };
        expect(mocks.createAsync).toHaveBeenCalledTimes(2);
        expect(mocks.createAsync).toHaveBeenCalledWith({ planTierId: 'plan-premium', option });
        expect(mocks.createAsync).toHaveBeenCalledWith({ planTierId: 'plan-baptism', option });
        await waitFor(() => expect(result.current.open).toBe(false));
    });

    it('needs at least one plan', () => {
        const { result } = renderHook(() => useExtensionDrawer(plans));
        act(() => result.current.openNew());
        act(() => result.current.updateDraft(change('months', '12')));
        act(() => result.current.updateDraft(change('price', '20')));
        expect(result.current.canSave).toBe(false);

        act(() => result.current.togglePlan('plan-premium'));
        expect(result.current.canSave).toBe(true);
        act(() => result.current.togglePlan('plan-premium'));
        expect(result.current.canSave).toBe(false);
    });

    it('drops a plan that already sells the typed length', () => {
        const { result } = renderHook(() => useExtensionDrawer(plans));
        act(() => result.current.openNew());
        act(() => result.current.togglePlan('plan-classic'));
        act(() => result.current.updateDraft(change('months', '6')));

        expect(result.current.sellingLength.has('plan-classic')).toBe(true);
        expect(result.current.draft.planTierIds).toEqual([]);

        // A different length gives it back.
        act(() => result.current.updateDraft(change('months', '3')));
        expect(result.current.draft.planTierIds).toEqual(['plan-classic']);
    });

    it('keeps only the plans that failed picked, with the error', async () => {
        const failure = new Error('nope');
        mocks.createAsync.mockImplementation(({ planTierId }: { planTierId: string }) =>
            planTierId === 'plan-baptism' ? Promise.reject(failure) : Promise.resolve({}),
        );
        const { result } = renderHook(() => useExtensionDrawer(plans));
        act(() => result.current.openNew());
        act(() => result.current.togglePlan('plan-premium'));
        act(() => result.current.togglePlan('plan-baptism'));
        act(() => result.current.updateDraft(change('months', '12')));
        act(() => result.current.updateDraft(change('price', '20')));
        act(() => result.current.save(submit));

        await waitFor(() => expect(result.current.error).toBe(failure));
        expect(result.current.open).toBe(true);
        expect(result.current.draft.planTierIds).toEqual(['plan-baptism']);
    });

    it('changes only the price of an existing extension', () => {
        const { result } = renderHook(() => useExtensionDrawer(plans));
        act(() => result.current.openEdit(extensionRowsFromPlans(plans)[0]));
        expect(result.current.editing?.option.id).toBe('ext-6');
        // Nothing changed yet.
        expect(result.current.canSave).toBe(false);

        act(() => result.current.updateDraft(change('price', '35')));
        act(() => result.current.save(submit));

        expect(mocks.update).toHaveBeenCalledWith(
            { planTierId: 'plan-classic', optionId: 'ext-6', patch: { priceAmountMinor: 3_500 } },
            expect.anything(),
        );
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it('retires a live extension and puts a retired one back', () => {
        const retired = [eventPlanFixture({ extensionOptions: [extensionFixture({ id: 'ext-3', months: 3, active: false })] })];
        const { result, rerender } = renderHook(({ list }) => useExtensionDrawer(list), { initialProps: { list: plans } });

        act(() => result.current.openEdit(extensionRowsFromPlans(plans)[0]));
        act(() => result.current.toggleActive());
        expect(mocks.update).toHaveBeenLastCalledWith({ planTierId: 'plan-classic', optionId: 'ext-6', patch: { active: false } }, expect.anything());

        rerender({ list: retired });
        act(() => result.current.openEdit(extensionRowsFromPlans(retired)[0]));
        act(() => result.current.toggleActive());
        expect(mocks.update).toHaveBeenLastCalledWith({ planTierId: 'plan-classic', optionId: 'ext-3', patch: { active: true } }, expect.anything());
    });
});
