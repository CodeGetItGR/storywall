import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventFormController } from '@/hooks/useCreateEventFormController';
import { planRequirementsOf } from '@/lib/__fixtures__/planRequirements';
import { ApiError } from '@/lib/api/client';

const mocks = vi.hoisted(() => ({
    params: new URLSearchParams(),
    plans: [] as unknown[],
    isLoadingPlans: false,
    push: vi.fn(),
    replace: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    post: vi.fn(),
    navigateToCheckout: vi.fn(),
    giftValid: true,
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
    useSearchParams: () => mocks.params,
}));
vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => (_error: unknown, fallback?: string) => fallback ?? 'failed' }));
vi.mock('@/hooks/useAppConfig', () => ({
    useAppConfig: () => ({
        data: {
            eventTypes: [{ eventTypeKey: 'WEDDING', isEnabled: true }],
            modules: [],
            media: null,
            coverage: { minDaysAfterStart: 30 },
        },
        refetch: vi.fn(),
    }),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, user: { emailVerified: true } }) }));
vi.mock('@/hooks/useBilling', () => ({ usePreviewCreateEventCode: () => ({ reset: vi.fn(), mutateAsync: vi.fn(), isPending: false }) }));
vi.mock('@/hooks/useCreateEventGift', () => ({
    useCreateEventGift: () => ({ isValid: mocks.giftValid, isSaving: false, reset: vi.fn(), saveToDraft: vi.fn(async () => {}) }),
}));
vi.mock('@/hooks/useEvent', () => ({
    useCreateEvent: () => ({ mutateAsync: mocks.create, reset: vi.fn(), error: null, isPending: false }),
    useUpdateEvent: () => ({ mutateAsync: mocks.update, isPending: false }),
}));
vi.mock('@/hooks/useEventTheme', () => ({ useThemePresetsForType: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => {} }));
vi.mock('@/hooks/usePartnerBrandingConsent', () => ({
    usePartnerBrandingConsent: () => ({ satisfied: true, requestFields: {}, notice: null, accepted: false, handleChange: vi.fn() }),
}));
vi.mock('@/hooks/usePlanTiersForEventType', () => ({
    usePlanTiersForEventType: () => ({ data: mocks.plans, isLoading: mocks.isLoadingPlans, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useResetOnBfcacheRestore', () => ({ useResetOnBfcacheRestore: () => {} }));
vi.mock('@/hooks/useWithdrawalConsent', () => ({
    useWithdrawalConsent: () => ({
        consentSatisfied: true,
        requestsImmediateStart: true,
        acknowledgesWithdrawalTerms: true,
        termsVersion: 'v1',
        handleCheckoutError: () => false,
    }),
}));
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post: mocks.post, put: vi.fn() },
}));
vi.mock('@/lib/billing', () => ({ navigateToCheckout: mocks.navigateToCheckout }));

function plan(code: string, moduleKeys: string[]) {
    return {
        code,
        name: code,
        moduleKeys,
        requirements: planRequirementsOf(moduleKeys),
        coverageOptions: [{ id: `${code}-6`, kind: 'INITIAL', months: 6, priceAmountMinor: 4_900, promoPriceAmountMinor: null, sortOrder: 0, active: true }],
        initialOptions: [{ id: `${code}-6`, kind: 'INITIAL', months: 6, priceAmountMinor: 4_900, promoPriceAmountMinor: null, sortOrder: 0, active: true }],
    };
}

const QR = plan('QR', ['gallery']);
const START = plan('START', ['posts', 'gallery']);

function openWizard(search: string) {
    mocks.params = new URLSearchParams(search);
    return renderHook(() => useCreateEventFormController());
}

function changeEvent(value: string) {
    return { target: { value } } as React.ChangeEvent<HTMLInputElement>;
}

function submitEvent() {
    return { preventDefault: () => {} } as React.SubmitEvent<HTMLFormElement>;
}

describe('useCreateEventFormController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.plans = [START, QR];
        mocks.isLoadingPlans = false;
        mocks.giftValid = true;
        mocks.create.mockResolvedValue({ id: 'e1' });
        mocks.post.mockResolvedValue({});
    });

    describe('a plan that asks for the title only', () => {
        it('has no details step and continues from the plan to the overview', () => {
            const { result } = openWizard('step=plan&plan=QR');

            expect(result.current.asksDetails).toBe(false);
            expect(result.current.steps).toEqual(['type', 'plan', 'overview']);
            expect(result.current.stepAfterPlan).toBe('overview');

            result.current.goToNextStep();
            expect(mocks.push).toHaveBeenCalledWith(expect.stringContaining('step=overview'), { scroll: false });
        });

        it('stays on the overview before a title is typed, with paying held back', () => {
            const { result } = openWizard('step=overview&plan=QR');

            expect(mocks.replace).not.toHaveBeenCalled();
            expect(result.current.canSubmitDetails).toBe(false);
        });

        it('moves a link to the details step on to the overview', () => {
            openWizard('step=details&plan=QR');
            expect(mocks.replace).toHaveBeenCalledWith(expect.stringContaining('step=overview'));
        });

        it('waits for the plans before moving a link on', () => {
            mocks.isLoadingPlans = true;
            openWizard('step=details&plan=QR');
            expect(mocks.replace).not.toHaveBeenCalled();
        });

        it('creates the event with the title and no date, place or first session', async () => {
            const { result } = openWizard('step=overview&plan=QR');
            act(() => result.current.onTitleChange(changeEvent('  Our wedding ')));
            expect(result.current.canSubmitDetails).toBe(true);

            await act(async () => result.current.handleSubmit(submitEvent()));

            expect(mocks.create).toHaveBeenCalledTimes(1);
            const input = mocks.create.mock.calls[0][0];
            expect(input).toMatchObject({ title: 'Our wedding', planTierCode: 'QR', coverageOptionId: 'QR-6', eventType: 'WEDDING' });
            for (const field of ['startAt', 'endAt', 'timezone', 'locationName', 'locationAddress', 'mapsUrl', 'initialSessionTitle']) {
                expect(input).not.toHaveProperty(field);
            }
            expect(mocks.navigateToCheckout).toHaveBeenCalledTimes(1);
        });

        it('does nothing on submit without a title', async () => {
            const { result } = openWizard('step=overview&plan=QR');
            act(() => result.current.onTitleChange(changeEvent('   ')));

            await act(async () => result.current.handleSubmit(submitEvent()));

            expect(mocks.create).not.toHaveBeenCalled();
        });

        it('holds paying back while a gift is missing its fields', () => {
            mocks.giftValid = false;
            const { result } = openWizard('step=overview&plan=QR');
            act(() => result.current.onTitleChange(changeEvent('Our wedding')));
            expect(result.current.canSubmitDetails).toBe(false);
        });

        it('stays on the overview when the server refuses the title', async () => {
            mocks.create.mockRejectedValue(new ApiError(400, { errorCode: 1000, status: 400, title: 'Bad request', errors: { title: 'Too long' } }));
            const { result } = openWizard('step=overview&plan=QR');
            act(() => result.current.onTitleChange(changeEvent('Our wedding')));

            await act(async () => result.current.handleSubmit(submitEvent()));

            expect(mocks.push).not.toHaveBeenCalled();
            // The field shows it, not the banner too.
            expect(result.current.error).toBeNull();
            expect(result.current.isSubmitPending).toBe(false);
        });

        it('saves a title changed after the draft was created, without creating another', async () => {
            mocks.post.mockRejectedValueOnce(new Error('declined'));
            const { result } = openWizard('step=overview&plan=QR');
            act(() => result.current.onTitleChange(changeEvent('Our wedding')));
            await act(async () => result.current.handleSubmit(submitEvent()));
            expect(result.current.hasDraft).toBe(true);

            act(() => result.current.onTitleChange(changeEvent('Our big day')));
            await act(async () => result.current.handleSubmit(submitEvent()));

            expect(mocks.create).toHaveBeenCalledTimes(1);
            expect(mocks.update).toHaveBeenCalledWith({ title: 'Our big day' });
            expect(mocks.navigateToCheckout).toHaveBeenCalledTimes(1);
        });
    });

    describe('a plan picked after the draft was created', () => {
        async function failFirstCheckout(result: { current: ReturnType<typeof useCreateEventFormController> }) {
            mocks.post.mockRejectedValueOnce(new Error('declined'));
            act(() => result.current.onTitleChange(changeEvent('Our wedding')));
            await act(async () => result.current.handleSubmit(submitEvent()));
            expect(mocks.create).toHaveBeenCalledTimes(1);
        }

        it('creates a draft on the new plan and checks that one out, leaving the old draft alone', async () => {
            mocks.create.mockResolvedValueOnce({ id: 'e1' }).mockResolvedValueOnce({ id: 'e2' });
            const { result } = openWizard('step=overview&plan=QR');
            await failFirstCheckout(result);

            act(() => {
                result.current.onSelectPlan('START');
                result.current.onStartAtChange('2027-01-15T18:00');
                result.current.onLocationNameChange(changeEvent('Church'));
                result.current.onLocationAddressChange(changeEvent('Main St 1'));
            });
            await act(async () => result.current.handleSubmit(submitEvent()));

            expect(mocks.create).toHaveBeenCalledTimes(2);
            expect(mocks.create.mock.calls[1][0]).toMatchObject({ planTierCode: 'START', locationName: 'Church' });
            expect(mocks.update).not.toHaveBeenCalled();
            expect(mocks.post).toHaveBeenLastCalledWith(expect.stringContaining('e2'), expect.anything());
            expect(mocks.navigateToCheckout).toHaveBeenCalledWith('e2', expect.anything());
        });

        it('reuses the draft when the host comes back to its plan', async () => {
            const { result } = openWizard('step=overview&plan=QR');
            await failFirstCheckout(result);

            act(() => result.current.onSelectPlan('START'));
            act(() => result.current.onSelectPlan('QR'));
            await act(async () => result.current.handleSubmit(submitEvent()));

            expect(mocks.create).toHaveBeenCalledTimes(1);
            expect(mocks.navigateToCheckout).toHaveBeenCalledWith('e1', expect.anything());
        });

        it('reuses the new draft on the next try', async () => {
            mocks.create.mockResolvedValueOnce({ id: 'e1' }).mockResolvedValueOnce({ id: 'e2' });
            mocks.plans = [START, QR, plan('WISHBOOK', ['wishbook'])];
            const { result } = openWizard('step=overview&plan=QR');
            await failFirstCheckout(result);

            act(() => result.current.onSelectPlan('WISHBOOK'));
            mocks.post.mockRejectedValueOnce(new Error('declined'));
            await act(async () => result.current.handleSubmit(submitEvent()));
            await act(async () => result.current.handleSubmit(submitEvent()));

            expect(mocks.create).toHaveBeenCalledTimes(2);
            expect(mocks.navigateToCheckout).toHaveBeenCalledWith('e2', expect.anything());
        });
    });

    describe('a plan that asks for details', () => {
        it('keeps the details step and its requirements', () => {
            const { result } = openWizard('step=details&plan=START');

            expect(result.current.asksDetails).toBe(true);
            expect(result.current.steps).toEqual(['type', 'plan', 'details', 'overview']);
            expect(result.current.stepAfterPlan).toBe('details');
            expect(mocks.replace).not.toHaveBeenCalled();

            act(() => result.current.onTitleChange(changeEvent('Our wedding')));
            expect(result.current.canSubmitDetails).toBe(false);
        });

        it('sends back from the overview until the details are filled in', () => {
            openWizard('step=overview&plan=START');
            expect(mocks.replace).toHaveBeenCalledWith(expect.stringContaining('step=details'));
        });

        function fillDetails(result: { current: ReturnType<typeof useCreateEventFormController> }) {
            act(() => {
                result.current.onTitleChange(changeEvent('Our wedding'));
                result.current.onStartAtChange('2027-01-15T18:00');
                result.current.onLocationNameChange(changeEvent('Church'));
                result.current.onLocationAddressChange(changeEvent('Main St 1'));
            });
        }

        it('creates the event with its date and place', async () => {
            const { result } = openWizard('step=overview&plan=START');
            fillDetails(result);

            await act(async () => result.current.handleSubmit(submitEvent()));

            expect(mocks.create.mock.calls[0][0]).toMatchObject({
                title: 'Our wedding',
                planTierCode: 'START',
                startAt: new Date('2027-01-15T18:00').toISOString(),
                locationName: 'Church',
                locationAddress: 'Main St 1',
            });
        });

        it('keeps what was typed when switching to a lite plan and back, sending it only for the full plan', async () => {
            const { result } = openWizard('step=overview&plan=START');
            fillDetails(result);

            act(() => result.current.onSelectPlan('QR'));
            expect(result.current.asksDetails).toBe(false);
            expect(result.current.title).toBe('Our wedding');
            expect(result.current.startAt).toBe('2027-01-15T18:00');

            act(() => result.current.onSelectPlan('START'));
            expect(result.current.asksDetails).toBe(true);
            expect(result.current.locationName).toBe('Church');
            expect(result.current.canSubmitDetails).toBe(true);

            act(() => result.current.onSelectPlan('QR'));
            await act(async () => result.current.handleSubmit(submitEvent()));
            const input = mocks.create.mock.calls[0][0];
            expect(input.planTierCode).toBe('QR');
            expect(input.title).toBe('Our wedding');
            expect(input).not.toHaveProperty('startAt');
            expect(input).not.toHaveProperty('locationName');
        });

        it('ignores a date that is out of range once on a lite plan', () => {
            const { result } = openWizard('step=overview&plan=START');
            act(() => {
                result.current.onTitleChange(changeEvent('Our wedding'));
                result.current.onStartAtChange('2020-01-01T10:00');
            });
            expect(result.current.scheduleError).not.toBeNull();
            expect(result.current.projectedCoverage).toBeNull();

            act(() => result.current.onSelectPlan('QR'));
            expect(result.current.canSubmitDetails).toBe(true);
            expect(result.current.projectedCoverage).not.toBeNull();
        });
    });
});
