import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventFormController } from '@/hooks/useCreateEventFormController';
import { readCreateEventWizardDraft, writeCreateEventWizardDraft } from '@/lib/createEventWizardDraft';

const params = vi.hoisted(() => ({ current: new URLSearchParams() }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const auth = vi.hoisted(() => ({ current: { isAuthenticated: false, user: null as null | { emailVerified: boolean } } }));
const plansEnabled = vi.hoisted(() => ({ calls: [] as unknown[][] }));

vi.mock('next/navigation', () => ({ useRouter: () => router, useSearchParams: () => params.current }));
vi.mock('next-intl', () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => false }), useLocale: () => 'en' }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({}) }));
vi.mock('@/hooks/useAppConfig', () => ({
    useAppConfig: () => ({
        data: {
            eventTypes: [
                { eventTypeKey: 'WEDDING', isEnabled: true },
                { eventTypeKey: 'BAPTISM', isEnabled: true },
            ],
            modules: [],
            media: null,
            coverage: {},
        },
        refetch: vi.fn(),
    }),
}));
vi.mock('@/hooks/usePlanTiersForEventType', () => ({
    usePlanTiersForEventType: (...args: unknown[]) => {
        plansEnabled.calls.push(args);
        return { data: [], isLoading: false, refetch: vi.fn() };
    },
}));
vi.mock('@/hooks/useEventTheme', () => ({ useThemePresetsForType: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@/hooks/useEvent', () => ({
    useCreateEvent: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
    useUpdateEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useBilling', () => ({ usePreviewCreateEventCode: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), isPending: false }) }));
vi.mock('@/hooks/useGift', () => ({ useSaveGift: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock('@/hooks/useWithdrawalConsent', () => ({
    useWithdrawalConsent: () => ({ consentSatisfied: false, handleCheckoutError: () => false }),
}));
vi.mock('@/hooks/usePartnerBrandingConsent', () => ({ usePartnerBrandingConsent: () => ({ satisfied: true, requestFields: {} }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));

beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/?create=1&run=r1');
    params.current = new URLSearchParams('create=1&run=r1');
    plansEnabled.calls = [];
});

afterEach(() => vi.clearAllMocks());

describe('useCreateEventFormController in wizard mode', () => {
    it('starts from the saved answers', () => {
        writeCreateEventWizardDraft({
            run: 'r1',
            step: 'details',
            eventType: 'BAPTISM',
            planCode: 'BASIC',
            durationPicks: {},
            title: 'Eleni',
            startAt: '',
            timezone: 'Europe/Athens',
            locationName: 'Church',
            locationAddress: '',
            mapsUrl: '',
            themePresetId: null,
            gift: { isGift: false, details: { recipientLabel: '', giverDisplayName: '', recipientEmail: '' } },
            checkoutCode: '',
        });
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        expect(result.current.title).toBe('Eleni');
        expect(result.current.locationName).toBe('Church');
        expect(result.current.selectedEventType).toBe('BAPTISM');
    });

    it("lets a link's type win, dropping answers for another type", () => {
        writeCreateEventWizardDraft({
            run: 'r1',
            step: 'details',
            eventType: 'BAPTISM',
            planCode: 'BASIC',
            durationPicks: {},
            title: 'Eleni',
            startAt: '',
            timezone: 'Europe/Athens',
            locationName: '',
            locationAddress: '',
            mapsUrl: '',
            themePresetId: null,
            gift: { isGift: false, details: { recipientLabel: '', giverDisplayName: '', recipientEmail: '' } },
            checkoutCode: '',
        });
        params.current = new URLSearchParams('create=1&run=r1&type=wedding');
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        expect(result.current.selectedEventType).toBe('WEDDING');
        expect(result.current.title).toBe('');
    });

    it('saves what the host types', () => {
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        act(() => result.current.onTitleChange({ target: { value: 'Our wedding' } } as React.ChangeEvent<HTMLInputElement>));
        expect(readCreateEventWizardDraft()?.title).toBe('Our wedding');
    });

    it('asks for plans while signed out', () => {
        renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        expect(plansEnabled.calls.at(-1)).toEqual(['WEDDING', true, true]);
    });

    it('writes the step into the entry it opened on, so Back to that entry shows that step', () => {
        renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        expect(window.location.search).toBe('?create=1&run=r1&step=type');
    });

    it('leaves the URL alone when it already names the step', () => {
        window.history.replaceState(null, '', '/?create=1&run=r1&step=plan');
        params.current = new URLSearchParams('create=1&run=r1&step=plan');
        const replace = vi.spyOn(window.history, 'replaceState');
        renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        expect(replace).not.toHaveBeenCalled();
        replace.mockRestore();
    });

    it('moves between steps without the router', () => {
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        act(() => result.current.goToPlan());
        expect(router.push).not.toHaveBeenCalled();
        expect(window.location.search).toContain('step=plan');
    });

    it('saves nothing in the old flow', () => {
        const { result } = renderHook(() => useCreateEventFormController());
        act(() => result.current.onTitleChange({ target: { value: 'Our wedding' } } as React.ChangeEvent<HTMLInputElement>));
        expect(readCreateEventWizardDraft()).toBeNull();
        expect(plansEnabled.calls.at(-1)).toEqual(['WEDDING', false, false]);
    });
});
