import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventFormController } from '@/hooks/useCreateEventFormController';
import { writeCampaignAttributionCookie } from '@/lib/campaignAttribution';
import { CAMPAIGN_ATTRIBUTION_COOKIE, CONSENT_COOKIE, writeConsent } from '@/lib/consent';

const mocks = vi.hoisted(() => ({ post: vi.fn(), navigateToCheckout: vi.fn() }));

vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get: vi.fn(), put: vi.fn(), post: (...args: unknown[]) => mocks.post(...args) },
}));
vi.mock('@/lib/billing', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/billing')>()),
    navigateToCheckout: (...args: unknown[]) => mocks.navigateToCheckout(...args),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams('step=overview'),
}));
vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
}));

const plan = { code: 'PLUS', moduleKeys: [], isGiftable: false, initialOptions: [{ id: 'option-1', active: true, sortOrder: 1, months: 12 }] };
const stable = {
    appConfig: { data: { eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }], modules: [], media: null, coverage: { minDaysAfterStart: 7 } }, refetch: vi.fn() },
    planTiers: { data: [plan], isLoading: false, refetch: vi.fn() },
    durationPicks: { picks: {}, resetPicks: vi.fn(), pickDuration: vi.fn() },
    gift: { isValid: true, isSaving: false, reset: vi.fn(), saveToDraft: vi.fn().mockResolvedValue(undefined) },
    createEvent: { mutateAsync: vi.fn().mockResolvedValue({ id: 'event-1' }), reset: vi.fn(), isPending: false, error: null },
    updateDraft: { mutateAsync: vi.fn(), isPending: false },
    previewCode: { mutateAsync: vi.fn(), reset: vi.fn(), isPending: false },
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
vi.mock('@/hooks/useCreateEventGift', () => ({ useCreateEventGift: () => stable.gift }));
vi.mock('@/hooks/useDurationPicks', () => ({ useDurationPicks: () => stable.durationPicks }));
vi.mock('@/hooks/useEvent', () => ({ useCreateEvent: () => stable.createEvent, useUpdateEvent: () => stable.updateDraft }));
vi.mock('@/hooks/useEventTheme', () => ({ useThemePresetsForType: () => stable.themePresets }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => undefined }));
vi.mock('@/hooks/usePlanTiersForEventType', () => ({ usePlanTiersForEventType: () => stable.planTiers }));
vi.mock('@/hooks/useResetOnBfcacheRestore', () => ({ useResetOnBfcacheRestore: () => undefined }));
vi.mock('@/hooks/useWithdrawalConsent', () => ({ useWithdrawalConsent: () => stable.consent }));

const change = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLInputElement>;

// The local datetime-local value for a few days from now.
function startAtInDays(days: number) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}

async function submitCheckout() {
    const { result } = renderHook(() => useCreateEventFormController());
    act(() => result.current.onTitleChange(change('Anna and Nick')));
    act(() => result.current.onStartAtChange(startAtInDays(10)));
    act(() => result.current.onLocationNameChange(change('Venue')));
    act(() => result.current.onLocationAddressChange(change('Street 1')));
    await act(() => result.current.handleSubmit({ preventDefault: vi.fn() } as never));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    return mocks.post.mock.calls[0][1] as Record<string, unknown>;
}

describe('create event checkout attribution', () => {
    beforeEach(() => {
        mocks.post.mockReset();
        mocks.post.mockResolvedValue({});
        writeConsent({ ads: false, analytics: true });
        writeCampaignAttributionCookie({ utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'bf-post-el' });
    });
    afterEach(() => {
        cleanup();
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=; Max-Age=0; Path=/`;
        document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`;
    });

    it('sends the campaign link with the checkout of a new event', async () => {
        const body = await submitCheckout();

        expect(body).toMatchObject({ attribution: { source: 'instagram', medium: 'social', campaign: 'bf-post-el' }, termsVersion: 'v1' });
    });

    it('sends nothing without analytics consent', async () => {
        writeConsent({ ads: true, analytics: false });

        const body = await submitCheckout();

        expect(body).not.toHaveProperty('attribution');
    });
});
