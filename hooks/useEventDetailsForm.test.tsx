import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEventDetailsForm } from '@/hooks/useEventDetailsForm';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';
import { getCurrentTimezone } from '@/lib/timezones';

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string) => key,
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'server message' }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: { coverage: { minDaysAfterStart: 7 } } }) }));

const KEY = 'details-test';
const change = (value: string) => ({ target: { value } }) as never;

function renderForm(options: { earliestStartAt?: string | null; coverageEndsAt?: string | null } = {}) {
    return renderHook(() => useEventDetailsForm({ storageKey: KEY, coverageEndsAt: '2030-01-10T00:00:00.000Z', ...options })).result;
}

describe('useEventDetailsForm', () => {
    afterEach(() => window.sessionStorage.clear());

    it('allows a past date back to the day of payment, and not before', () => {
        const form = renderForm({ earliestStartAt: '2026-03-05T15:00:00' });
        expect(form.current.startAtMin).toBe('2026-03-05T00:00');

        act(() => form.current.onStartAtChange('2026-03-05T09:00'));
        expect(form.current.scheduleError).toBeNull();

        act(() => form.current.onStartAtChange('2026-03-04T23:00'));
        expect(form.current.scheduleError).toBe('validation.startBeforePayment');
    });

    it('refuses a past date when there is no day of payment', () => {
        const form = renderForm();
        act(() => form.current.onStartAtChange('2020-01-01T09:00'));
        expect(form.current.scheduleError).toBe('validation.startInPast');
    });

    it('refuses a date that leaves too little coverage after it', () => {
        const form = renderForm({ coverageEndsAt: '2030-01-10T00:00:00.000Z' });
        act(() => form.current.onStartAtChange('2030-01-09T09:00'));
        expect(form.current.scheduleError).toBe('validation.startTooFarAhead');
    });

    it('is complete once the date and place are filled, with the map link optional', () => {
        const form = renderForm();
        expect(form.current.isComplete).toBe(false);

        act(() => {
            form.current.onStartAtChange('2029-06-01T18:00');
            form.current.onTimezoneChange(change(form.current.timezoneOptions[0]));
            form.current.onLocationNameChange(change('Hall'));
        });
        expect(form.current.isComplete).toBe(false);

        act(() => form.current.onLocationAddressChange(change('Main 1')));
        expect(form.current.isComplete).toBe(true);
        expect(form.current.request).toMatchObject({ locationName: 'Hall', locationAddress: 'Main 1' });
    });

    it('starts on what was typed earlier', () => {
        const first = renderForm();
        act(() => first.current.onLocationNameChange(change('Hall')));

        expect(renderForm().current.locationName).toBe('Hall');
    });

    it('starts on the time zone of the device', () => {
        expect(renderForm().current.timezone).toBe(getCurrentTimezone());
    });

    it('puts a date the server refuses on the date field, until it changes', () => {
        const form = renderForm();
        const refused = new ApiError(400, { errorCode: ERROR_CODES.EVENT_START_TOO_FAR_AHEAD });

        let applied = false;
        act(() => {
            applied = form.current.applyServerError(refused);
        });
        expect(applied).toBe(true);
        expect(form.current.scheduleError).toBe('server message');

        act(() => form.current.onStartAtChange('2029-06-01T18:00'));
        expect(form.current.scheduleError).toBeNull();
    });

    it('says a date before the payment is refused in its own words', () => {
        const form = renderForm({ earliestStartAt: '2026-03-05T15:00:00' });
        act(() => {
            form.current.applyServerError(new ApiError(400, { errorCode: ERROR_CODES.EVENT_START_BEFORE_PURCHASE }));
        });
        expect(form.current.scheduleError).toBe('validation.startBeforePayment');
    });

    it('puts the fields of a refused request on their fields', () => {
        const form = renderForm();
        act(() => {
            form.current.applyServerError(new ApiError(400, { errorCode: 'VALIDATION_FAILED', errors: { 'details.locationName': 'Too long' } }));
        });
        expect(form.current.locationNameError).toBe('Too long');
    });

    it('leaves other errors alone', () => {
        const form = renderForm();
        let applied = true;
        act(() => {
            applied = form.current.applyServerError(new ApiError(500, { errorCode: 9999 }));
        });
        expect(applied).toBe(false);
        expect(form.current.scheduleError).toBeNull();
    });
});
