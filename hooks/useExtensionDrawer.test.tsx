import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { eventPlanFixture, extensionFixture } from '@/components/admin/__fixtures__/extensionPlans';
import { useExtensionDrawer } from '@/hooks/useExtensionDrawer';
import { extensionRowsFromPlans } from '@/lib/adminExtensions';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));

function mutation(mutate: typeof mocks.create) {
    return { mutate, reset: vi.fn(), isPending: false, error: null };
}

vi.mock('@/hooks/useAdminCoverageOptions', () => ({
    useCreateCoverageOption: () => mutation(mocks.create),
    useUpdateCoverageOption: () => mutation(mocks.update),
}));

const plans = [
    eventPlanFixture({ extensionOptions: [extensionFixture({ id: 'ext-6', months: 6, priceAmountMinor: 2_900 })] }),
    eventPlanFixture({ id: 'plan-premium', name: 'Premium', extensionOptions: [] }),
];

function change(name: string, value: string) {
    return { currentTarget: { name, value } } as unknown as React.ChangeEvent<HTMLInputElement>;
}

const submit = { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;

describe('useExtensionDrawer', () => {
    beforeEach(() => {
        mocks.create.mockReset();
        mocks.update.mockReset();
    });

    it('creates an extension on the picked plan, priced above zero', () => {
        const { result } = renderHook(() => useExtensionDrawer(plans));
        act(() => result.current.openNew());
        expect(result.current.open).toBe(true);
        expect(result.current.editing).toBeNull();

        act(() => result.current.updateDraft(change('planTierId', 'plan-premium')));
        act(() => result.current.updateDraft(change('months', '12')));
        act(() => result.current.updateDraft(change('price', '0')));
        expect(result.current.canSave).toBe(false);

        act(() => result.current.updateDraft(change('price', '49.50')));
        expect(result.current.canSave).toBe(true);
        act(() => result.current.save(submit));

        expect(mocks.create).toHaveBeenCalledWith(
            { planTierId: 'plan-premium', option: { kind: 'EXTENSION', months: 12, priceAmountMinor: 4_950, sortOrder: 0 } },
            expect.anything(),
        );
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
