import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventGift } from '@/hooks/useCreateEventGift';
import type { GiftHandoverRequestDto, PlanTierResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ saves: [] as { eventId: string; input: GiftHandoverRequestDto }[] }));

vi.mock('@/hooks/useGift', () => ({
    useSaveGift: () => ({
        mutateAsync: (payload: { eventId: string; input: GiftHandoverRequestDto }) => {
            mocks.saves.push(payload);
            return Promise.resolve({});
        },
        isPending: false,
    }),
}));

const giftable = { isGiftable: true, moduleKeys: ['co_hosts'] } as PlanTierResponseDto;
const checked = (value: boolean) => ({ target: { checked: value } }) as ChangeEvent<HTMLInputElement>;
const field = (name: string, value: string) => ({ target: { name, value } }) as ChangeEvent<HTMLInputElement>;

function fill(result: { current: ReturnType<typeof useCreateEventGift> }) {
    act(() => result.current.handleToggle(checked(true)));
    act(() => result.current.details.handleChange(field('recipientLabel', 'Anna')));
    act(() => result.current.details.handleChange(field('giverDisplayName', 'Maria')));
}

describe('useCreateEventGift', () => {
    beforeEach(() => {
        mocks.saves = [];
    });

    it('is offered only on a giftable plan', () => {
        expect(renderHook(() => useCreateEventGift(giftable)).result.current.available).toBe(true);
        expect(renderHook(() => useCreateEventGift({ ...giftable, isGiftable: false })).result.current.available).toBe(false);
    });

    it('is invalid while picked with empty fields', () => {
        const { result } = renderHook(() => useCreateEventGift(giftable));
        expect(result.current.isValid).toBe(true);

        act(() => result.current.handleToggle(checked(true)));
        expect(result.current.isValid).toBe(false);
    });

    it('saves the gift on the draft once, and again after a draft change', async () => {
        const { result } = renderHook(() => useCreateEventGift(giftable));
        fill(result);

        await act(() => result.current.saveToDraft('draft-1'));
        await act(() => result.current.saveToDraft('draft-1'));
        expect(mocks.saves).toEqual([{ eventId: 'draft-1', input: { recipientLabel: 'Anna', giverDisplayName: 'Maria' } }]);

        act(() => result.current.reset());
        await act(() => result.current.saveToDraft('draft-2'));
        expect(mocks.saves).toHaveLength(2);
    });

    it('saves nothing when the gift is not picked', async () => {
        const { result } = renderHook(() => useCreateEventGift(giftable));

        await act(() => result.current.saveToDraft('draft-1'));

        expect(mocks.saves).toEqual([]);
    });
});
