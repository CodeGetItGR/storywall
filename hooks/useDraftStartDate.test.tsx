import { act, renderHook } from '@testing-library/react';
import type { SubmitEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDraftStartDate } from '@/hooks/useDraftStartDate';
import { ApiError } from '@/lib/api/client';

type Dates = { startAt: string; endAt: string };

// A plain stub, not vi.fn: vitest's spy re-runs a rejecting implementation and
// reports the rejection as unhandled.
const mocks = vi.hoisted(() => ({
    calls: [] as Dates[],
    result: (): Promise<unknown> => Promise.resolve({}),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { coverage: { maxLeadDays: 540 } } }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'apiError' }));
vi.mock('@/hooks/useEvent', () => ({
    useUpdateEvent: () => ({
        mutateAsync: (dates: Dates) => {
            mocks.calls.push(dates);
            return mocks.result();
        },
        isPending: false,
    }),
}));

const submitEvent = { preventDefault: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>;

function localIn(days: number) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    date.setSeconds(0, 0);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

describe('useDraftStartDate', () => {
    beforeEach(() => {
        mocks.calls = [];
        mocks.result = () => Promise.resolve({ id: 'event-1' });
    });

    it('moves the start and keeps the event length', async () => {
        const { result } = renderHook(() => useDraftStartDate('event-1', { startAt: '2026-01-10T18:00:00Z', endAt: '2026-01-11T02:00:00Z' }));

        act(() => result.current.open());
        const next = localIn(30);
        act(() => result.current.handleChange(next));
        await act(async () => result.current.handleSubmit(submitEvent));

        const [dates] = mocks.calls;
        expect(dates.startAt).toBe(new Date(next).toISOString());
        expect(Date.parse(dates.endAt) - Date.parse(dates.startAt)).toBe(8 * 60 * 60 * 1000);
        expect(result.current.isOpen).toBe(false);
    });

    it('refuses a start in the past without saving', async () => {
        const { result } = renderHook(() => useDraftStartDate('event-1', { startAt: '2026-01-10T18:00:00Z', endAt: null }));

        act(() => result.current.open());
        act(() => result.current.handleChange(localIn(-2)));
        await act(async () => result.current.handleSubmit(submitEvent));

        expect(result.current.validationError).toBe('validation.startInPast');
        expect(result.current.canSave).toBe(false);
        expect(mocks.calls).toHaveLength(0);
    });

    it('keeps the modal open and shows the server error', async () => {
        const refusal = new ApiError(400, { errorCode: 3032 });
        mocks.result = () => Promise.reject(refusal);
        const { result } = renderHook(() => useDraftStartDate('event-1', { startAt: '2026-01-10T18:00:00Z', endAt: null }));

        act(() => result.current.open());
        act(() => result.current.handleChange(localIn(10)));
        await act(async () => {
            result.current.handleSubmit(submitEvent);
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(result.current.error).toBe('apiError');
        expect(result.current.isOpen).toBe(true);
        expect(mocks.calls).toHaveLength(1);
    });
});
