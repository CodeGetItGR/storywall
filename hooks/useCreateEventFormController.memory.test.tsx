import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CREATE_EVENT_FORM_ID, useCreateEventFormController } from '@/hooks/useCreateEventFormController';
import { readSavedCreateEventForm } from '@/lib/createEventFormMemory';

const mocks = vi.hoisted(() => ({ post: vi.fn(), navigateToCheckout: vi.fn(), push: vi.fn(), replace: vi.fn(), search: '' }));

vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: vi.fn(), put: vi.fn(), post: (...args: unknown[]) => mocks.post(...args) },
}));
vi.mock('@/lib/billing', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/billing')>()),
    navigateToCheckout: (...args: unknown[]) => mocks.navigateToCheckout(...args),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
    useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
}));

const plan = {
    code: 'PLUS',
    moduleKeys: ['co_hosts'],
    isGiftable: true,
    initialOptions: [
        { id: 'option-1', active: true, sortOrder: 1, months: 12 },
        { id: 'option-2', active: true, sortOrder: 2, months: 24 },
    ],
};
const stable = {
    appConfig: { data: { eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }], modules: [], media: null, coverage: { minDaysAfterStart: 7 } }, refetch: vi.fn() },
    planTiers: { data: [plan], isLoading: false, refetch: vi.fn() },
    createEvent: { mutateAsync: vi.fn().mockResolvedValue({ id: 'event-1' }), reset: vi.fn(), isPending: false, error: null },
    updateDraft: { mutateAsync: vi.fn(), isPending: false },
    previewCode: { mutateAsync: vi.fn(), reset: vi.fn(), isPending: false },
    saveGift: { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false },
    themePresets: { data: undefined, isLoading: false, error: null, refetch: vi.fn() },
    consent: {
        termsVersion: 'v1',
        requestsImmediateStart: true,
        acknowledgesWithdrawalTerms: true,
        staleTerms: false,
        consentSatisfied: true,
        handleRequestsImmediateStartChange: vi.fn(),
        handleAcknowledgesWithdrawalTermsChange: vi.fn(),
        handleCheckoutError: vi.fn(),
    },
};

vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => (error: unknown) => String(error) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => stable.appConfig }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, user: { emailVerified: true } }) }));
vi.mock('@/hooks/useBilling', () => ({ usePreviewCreateEventCode: () => stable.previewCode }));
vi.mock('@/hooks/useGift', () => ({ useSaveGift: () => stable.saveGift }));
vi.mock('@/hooks/useEvent', () => ({ useCreateEvent: () => stable.createEvent, useUpdateEvent: () => stable.updateDraft }));
vi.mock('@/hooks/useEventTheme', () => ({ useThemePresetsForType: () => stable.themePresets }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => undefined }));
vi.mock('@/hooks/usePlanTiersForEventType', () => ({ usePlanTiersForEventType: () => stable.planTiers }));
vi.mock('@/hooks/useResetOnBfcacheRestore', () => ({ useResetOnBfcacheRestore: () => undefined }));
vi.mock('@/hooks/useWithdrawalConsent', () => ({ useWithdrawalConsent: () => stable.consent }));

const change = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLInputElement>;
const giftChange = (name: string, value: string) => ({ target: { name, value } }) as ChangeEvent<HTMLInputElement>;
const submit = { preventDefault: vi.fn() } as never;

function startAtInDays(days: number) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}

function fillDetails(result: { current: ReturnType<typeof useCreateEventFormController> }) {
    act(() => result.current.onTitleChange(change('Anna and Nick')));
    act(() => result.current.onStartAtChange(startAtInDays(10)));
    act(() => result.current.onLocationNameChange(change('Venue')));
    act(() => result.current.onLocationAddressChange(change('Street 1')));
}

// A second mount of the hook is what a reload does to this form.
function reload(unmount: () => void) {
    unmount();
    return renderHook(() => useCreateEventFormController());
}

beforeEach(() => {
    mocks.post.mockReset();
    mocks.push.mockClear();
    mocks.replace.mockClear();
    stable.createEvent.mutateAsync.mockClear();
    mocks.search = 'run=run-1&step=details';
});

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    document.body.innerHTML = '';
});

describe('create form across a reload', () => {
    it('keeps what was filled in, and stays on the step', async () => {
        const { result, unmount } = renderHook(() => useCreateEventFormController());
        fillDetails(result);
        act(() => result.current.onSelectPlanDuration('PLUS', 'option-2'));
        act(() => result.current.gift.handleToggle({ target: { checked: true } } as ChangeEvent<HTMLInputElement>));
        act(() => result.current.gift.details.handleChange(giftChange('recipientLabel', 'Anna')));

        const { result: reloaded } = reload(unmount);

        expect(reloaded.current).toMatchObject({ title: 'Anna and Nick', locationName: 'Venue', locationAddress: 'Street 1' });
        expect(reloaded.current.selectedOption?.id).toBe('option-2');
        expect(reloaded.current.gift.enabled).toBe(true);
        expect(reloaded.current.gift.details.value.recipientLabel).toBe('Anna');
        await waitFor(() => expect(reloaded.current.step).toBe('details'));
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it('does not send a reload on the last step back to an earlier one', () => {
        mocks.search = 'run=run-1&step=details';
        const { result, unmount } = renderHook(() => useCreateEventFormController());
        fillDetails(result);

        mocks.search = 'run=run-1&step=overview';
        reload(unmount);

        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it('does not bring one run into another', () => {
        const { result, unmount } = renderHook(() => useCreateEventFormController());
        fillDetails(result);

        mocks.search = 'run=run-2&step=details';
        const { result: other } = reload(unmount);

        expect(other.current.title).toBe('');
    });

    it('reuses the draft a failed checkout left, rather than creating a second one', async () => {
        mocks.post.mockRejectedValueOnce(new Error('network'));
        mocks.search = 'run=run-1&step=details';
        const first = renderHook(() => useCreateEventFormController());
        fillDetails(first.result);
        first.unmount();

        mocks.search = 'run=run-1&step=overview';
        const { result, unmount } = renderHook(() => useCreateEventFormController());
        await act(() => result.current.handleSubmit(submit));
        expect(stable.createEvent.mutateAsync).toHaveBeenCalledTimes(1);

        mocks.post.mockResolvedValueOnce({});
        const { result: reloaded } = reload(unmount);
        await act(() => reloaded.current.handleSubmit(submit));

        expect(stable.createEvent.mutateAsync).toHaveBeenCalledTimes(1);
        expect(mocks.post).toHaveBeenCalledTimes(2);
    });

    it('forgets the form once the run goes to checkout', async () => {
        const first = renderHook(() => useCreateEventFormController());
        fillDetails(first.result);
        first.unmount();

        mocks.search = 'run=run-1&step=overview';
        mocks.post.mockResolvedValue({});
        const { result } = renderHook(() => useCreateEventFormController());
        await act(() => result.current.handleSubmit(submit));

        expect(readSavedCreateEventForm('run-1')).toBeNull();
    });
});

describe('Continue on the details step', () => {
    function renderFormFields(fields: { value: string; required?: boolean; invalid?: boolean }[]) {
        const form = document.createElement('form');
        form.id = CREATE_EVENT_FORM_ID;
        const inputs = fields.map(({ value, required, invalid }) => {
            const input = document.createElement('input');
            input.value = value;
            input.required = Boolean(required);
            if (invalid) input.setAttribute('aria-invalid', 'true');
            input.scrollIntoView = vi.fn();
            form.append(input);
            return input;
        });
        document.body.append(form);
        return inputs;
    }

    it('takes the host to a required field with only spaces in it', async () => {
        const [title, venue] = renderFormFields([{ value: 'Anna', required: true }, { value: '   ', required: true }]);
        const { result } = renderHook(() => useCreateEventFormController());
        act(() => result.current.onTitleChange(change('Anna')));

        await act(() => result.current.handleSubmit(submit));

        expect(document.activeElement).toBe(venue);
        expect(document.activeElement).not.toBe(title);
        expect(mocks.push).not.toHaveBeenCalled();
    });

    it('takes the host to a field marked invalid', async () => {
        const [, date] = renderFormFields([{ value: 'Anna', required: true }, { value: '2020-01-01', required: true, invalid: true }]);
        const { result } = renderHook(() => useCreateEventFormController());

        await act(() => result.current.handleSubmit(submit));

        expect(document.activeElement).toBe(date);
    });

    it('moves on when everything is filled in', async () => {
        const { result } = renderHook(() => useCreateEventFormController());
        fillDetails(result);

        await act(() => result.current.handleSubmit(submit));

        expect(mocks.push).toHaveBeenCalledTimes(1);
    });
});
