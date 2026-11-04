import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDraftEventDetails } from '@/hooks/useDraftEventDetails';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';
import { eventDetailsStorageKey, rememberEventDetailsValues } from '@/lib/eventDetailsForm';
import { getSupportedTimezones } from '@/lib/timezones';

const mocks = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string) => key,
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'server message' }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { coverage: { minDaysAfterStart: 7 } } }) }));
vi.mock('@/hooks/useEvent', () => ({ useUpdateEvent: () => ({ isPending: false, mutateAsync: mocks.mutateAsync }) }));

const submit = { preventDefault: () => undefined } as never;

// A month from now, as a datetime-local value.
function soon(): string {
    const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T18:00`;
}

function renderFilled() {
    rememberEventDetailsValues(eventDetailsStorageKey('e1'), {
        startAt: soon(),
        timezone: getSupportedTimezones()[0],
        locationName: 'Hall',
        locationAddress: 'Main 1',
        mapsUrl: '',
    });
    const { result } = renderHook(() => useDraftEventDetails('e1', { hostingMonths: 12 }));
    act(() => result.current.open());
    return result;
}

describe('useDraftEventDetails', () => {
    beforeEach(() => {
        mocks.mutateAsync.mockReset();
    });
    afterEach(() => window.sessionStorage.clear());

    it('saves the date and place on the draft and closes', async () => {
        mocks.mutateAsync.mockResolvedValue({});
        const details = renderFilled();

        await act(() => details.current.handleSubmit(submit));

        expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ locationName: 'Hall', locationAddress: 'Main 1' }));
        expect(details.current.isOpen).toBe(false);
    });

    it('stays open with the refused date on its field', async () => {
        mocks.mutateAsync.mockRejectedValue(new ApiError(400, { errorCode: ERROR_CODES.EVENT_START_TOO_FAR_AHEAD }));
        const details = renderFilled();

        await act(() => details.current.handleSubmit(submit));

        expect(details.current.isOpen).toBe(true);
        expect(details.current.form.scheduleError).toBe('server message');
        expect(details.current.error).toBeNull();
    });

    it('stays open with any other error in the popup', async () => {
        mocks.mutateAsync.mockRejectedValue(new ApiError(500, { errorCode: 9999 }));
        const details = renderFilled();

        await act(() => details.current.handleSubmit(submit));

        expect(details.current.isOpen).toBe(true);
        expect(details.current.error).toBe('server message');
    });

    it('saves nothing until the form is complete', async () => {
        const { result } = renderHook(() => useDraftEventDetails('e2', { hostingMonths: 12 }));

        await act(() => result.current.handleSubmit(submit));

        expect(mocks.mutateAsync).not.toHaveBeenCalled();
    });
});
