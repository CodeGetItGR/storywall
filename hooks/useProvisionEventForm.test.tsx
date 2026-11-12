import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProvisionEventForm } from '@/hooks/useProvisionEventForm';
import type { AdminProvisionEventRequestDto, PlanTierResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    moduleKeys: [] as string[],
    presetsArg: undefined as string | null | undefined,
    calls: [] as unknown[],
    vendorsApplicability: null as string | null,
    planVendorsConfig: null as Record<string, unknown> | null,
}));

vi.mock('next-intl', () => ({
    useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@/hooks/useAdmin', () => ({
    useAdminPlatformEventTypes: () => ({ data: [{ eventTypeKey: 'BAPTISM', isEnabled: true, sortOrder: 0, name: {} }] }),
    useAdminPlanTiers: () => ({
        data: [
            {
                id: 'plan-1',
                code: 'GRANT',
                scope: 'EVENT',
                isAssignable: true,
                eventTypeKey: 'BAPTISM',
                sortOrder: 0,
                moduleKeys: mocks.moduleKeys,
                initialOptions: [{ id: 'opt-1', months: 12, kind: 'INITIAL', isActive: true }],
            } as unknown as PlanTierResponseDto,
        ],
        isLoading: false,
    }),
}));
vi.mock('@/hooks/useEventTypeModuleMatrix', () => ({
    useEventTypeModuleMatrix: (eventTypeKey: string | null) => ({
        data:
            eventTypeKey && mocks.vendorsApplicability
                ? [
                      {
                          moduleKey: 'vendors',
                          applicability: mocks.vendorsApplicability,
                          defaultConfig: { maxVendors: 3, allowedTypes: [], accessDaysAfterEvent: 7, proStorageBytes: 0 },
                      },
                  ]
                : [],
    }),
}));
vi.mock('@/hooks/usePlanModuleConfigs', () => ({
    usePlanModuleConfigs: (planIds: string[]) => ({
        configsByPlanId: new Map(
            planIds.map((id) => [id, mocks.planVendorsConfig ? [{ moduleKey: 'vendors', defaultConfig: mocks.planVendorsConfig }] : []]),
        ),
        isLoading: false,
    }),
}));
vi.mock('@/hooks/useAdminDurationPick', () => ({
    useAdminDurationPick: () => ({ options: [], optionId: 'opt-1', selectedOption: null, handleChange: () => undefined }),
}));
vi.mock('@/lib/adminAccountProvisioning', () => ({
    eligibleProvisioningPlans: (plans: PlanTierResponseDto[]) => plans,
}));
vi.mock('@/hooks/useEventTheme', () => ({
    useThemePresetsForType: (eventType: string | null) => {
        mocks.presetsArg = eventType;
        return { data: eventType ? [{ id: 'swan', key: 'swan', name: {} }] : undefined, isLoading: false, error: null };
    },
}));
vi.mock('@/hooks/useAdminAccounts', () => ({
    useProvisionAdminEventMutation: () => ({
        mutateAsync: async (body: AdminProvisionEventRequestDto) => {
            mocks.calls.push(body);
            return { id: 'event-1' };
        },
        reset: () => undefined,
        error: null,
        data: undefined,
        isPending: false,
    }),
}));

// Like keepPreviousData: the last email stays in `data` even once the request is gone.
vi.mock('@/hooks/useAdminEmails', () => ({
    useWelcomeEmailPreview: () => ({
        data: { to: 'host@example.com', subject: 's', html: '', text: '' },
        isFetching: false,
        error: null,
    }),
}));

const HOST = { id: 'host-1', email: 'host@example.com', firstName: null, lastName: null };
const submitEvent = { preventDefault: () => undefined } as React.SubmitEvent<HTMLFormElement>;

function fillRequired(form: ReturnType<typeof useProvisionEventForm>) {
    form.setPlanTierCode('GRANT');
    form.setTitle('Baptism');
    form.setStartAt('2999-06-01T12:00');
    form.setTimezone('Europe/Athens');
    form.setLocationName('Church');
    form.setLocationAddress('Main St 1');
}

async function submitTwice(result: { current: ReturnType<typeof useProvisionEventForm> }) {
    await act(() => result.current.submit(submitEvent));
    await act(() => result.current.submit(submitEvent));
}

beforeEach(() => {
    mocks.moduleKeys = [];
    mocks.presetsArg = undefined;
    mocks.calls = [];
    mocks.vendorsApplicability = null;
    mocks.planVendorsConfig = null;
});

describe('useProvisionEventForm', () => {
    it('hides the RSVP deadline and theme, and sends neither, when the plan lacks both modules', async () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => {
            fillRequired(result.current);
            result.current.setRsvpDeadline('2999-05-01T12:00');
            result.current.setThemePresetId('swan');
        });

        expect(result.current.planHasRsvp).toBe(false);
        expect(result.current.isThemeAvailable).toBe(false);
        expect(mocks.presetsArg).toBeNull();

        await submitTwice(result);
        const body = mocks.calls[0] as AdminProvisionEventRequestDto;
        expect(body.event.rsvpDeadline).toBeUndefined();
        expect(body.event.themePresetId).toBeUndefined();
    });

    it('sends the description, RSVP deadline and theme when the plan includes them', async () => {
        mocks.moduleKeys = ['rsvp', 'theme'];
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => {
            fillRequired(result.current);
            result.current.setDescription('  Lunch after  ');
            result.current.setRsvpDeadline('2999-05-01T12:00');
            result.current.setThemePresetId('swan');
        });

        expect(result.current.planHasRsvp).toBe(true);
        expect(result.current.isThemeAvailable).toBe(true);
        expect(mocks.presetsArg).toBe('BAPTISM');

        await submitTwice(result);
        const body = mocks.calls[0] as AdminProvisionEventRequestDto;
        expect(body.event.description).toBe('Lunch after');
        expect(body.event.rsvpDeadline).toBe(new Date('2999-05-01T12:00').toISOString());
        expect(body.event.themePresetId).toBe('swan');
    });

    it('blocks review when the RSVP deadline is not before the start', () => {
        mocks.moduleKeys = ['rsvp'];
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => {
            fillRequired(result.current);
            result.current.setRsvpDeadline('2999-06-01T12:00');
        });

        expect(result.current.rsvpDeadlineError).toBe('rsvpDeadlineAfterStart');
        expect(result.current.canReview).toBe(false);
    });
    it('emails the host by default and sends notifyHost', async () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        await act(() => result.current.submit(submitEvent));
        expect(result.current.notifyHost).toBe(true);
        expect(result.current.welcomePreview).not.toBeNull();
        await act(() => result.current.submit(submitEvent));
        expect((mocks.calls.at(-1) as AdminProvisionEventRequestDto).notifyHost).toBe(true);
    });

    it('can skip the email, and then has no preview', async () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        await act(() => result.current.submit(submitEvent));
        act(() => result.current.setNotifyHost(false));
        expect(result.current.welcomePreview).toBeNull();
        await act(() => result.current.submit(submitEvent));
        expect((mocks.calls.at(-1) as AdminProvisionEventRequestDto).notifyHost).toBe(false);
    });

    it('never offers the email when the caller turns it off', async () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST, { canNotifyHost: false }));
        expect(result.current.canNotifyHost).toBe(false);
        expect(result.current.notifyHost).toBe(false);
        act(() => fillRequired(result.current));
        await submitTwice(result);
        expect((mocks.calls.at(-1) as AdminProvisionEventRequestDto).notifyHost).toBe(false);
    });

    it('never offers the email when the host has no email address', async () => {
        const { result } = renderHook(() => useProvisionEventForm({ ...HOST, email: null }));
        expect(result.current.canNotifyHost).toBe(false);
        act(() => fillRequired(result.current));
        await submitTwice(result);
        expect((mocks.calls.at(-1) as AdminProvisionEventRequestDto).notifyHost).toBe(false);
    });
});

describe('useProvisionEventForm vendor settings', () => {
    const PLAN_VENDORS = { maxVendors: 5, allowedTypes: ['PLANNER', 'MUSIC'], accessDaysAfterEvent: 30, proStorageBytes: 5368709120 };

    beforeEach(() => {
        mocks.moduleKeys = ['vendors'];
        mocks.vendorsApplicability = 'OPTIONAL';
        mocks.planVendorsConfig = PLAN_VENDORS;
    });

    it("starts from the plan's settings and sends none when they are left alone", async () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        expect(result.current.vendorSettings.isSupported).toBe(true);
        expect(result.current.vendorSettings.draft).toEqual({
            maxVendors: '5',
            allowedTypes: 'PLANNER,MUSIC',
            accessDaysAfterEvent: '30',
            proStorageBytes: '5 GB',
        });

        await submitTwice(result);
        expect((mocks.calls[0] as AdminProvisionEventRequestDto).moduleConfigs).toBeUndefined();
    });

    it('sends the changed settings with the event', async () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        act(() => result.current.vendorSettings.handleValueChange('maxVendors', '1'));
        act(() => result.current.vendorSettings.handleTypeChange('allowedTypes', 'MUSIC', false));
        expect(result.current.vendorSettings.changes).toEqual([
            { key: 'maxVendors', label: 'plans.grid.cell.fields.maxVendors', value: '1' },
            { key: 'allowedTypes', label: 'plans.grid.cell.fields.allowedTypes', value: 'collaborations.feedCard.roles.PLANNER' },
        ]);
        expect(result.current.vendorSettings.turnsVendorsOn).toBe(false);

        await submitTwice(result);
        expect((mocks.calls[0] as AdminProvisionEventRequestDto).moduleConfigs).toEqual([
            { moduleKey: 'vendors', configKey: 'maxVendors', value: 1 },
            { moduleKey: 'vendors', configKey: 'allowedTypes', value: ['PLANNER'] },
        ]);
    });

    it('blocks review while a setting is not a valid number', () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        expect(result.current.canReview).toBe(true);
        act(() => result.current.vendorSettings.handleValueChange('maxVendors', '-1'));
        expect(result.current.vendorSettings.errorKeys).toEqual(['maxVendors']);
        expect(result.current.canReview).toBe(false);
    });

    it('warns that settings on a plan without vendors turn vendors on', async () => {
        mocks.moduleKeys = [];
        mocks.planVendorsConfig = null;
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        // No plan row: the type's default is the starting point.
        expect(result.current.vendorSettings.draft.maxVendors).toBe('3');
        expect(result.current.vendorSettings.turnsVendorsOn).toBe(false);
        act(() => result.current.vendorSettings.handleValueChange('maxVendors', '1'));
        expect(result.current.vendorSettings.turnsVendorsOn).toBe(true);

        await submitTwice(result);
        expect((mocks.calls[0] as AdminProvisionEventRequestDto).moduleConfigs).toEqual([
            { moduleKey: 'vendors', configKey: 'maxVendors', value: 1 },
        ]);
    });

    it('has no vendor settings for a type without vendors, and sends none', async () => {
        mocks.vendorsApplicability = 'UNSUPPORTED';
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        act(() => result.current.vendorSettings.handleValueChange('maxVendors', 'x'));
        expect(result.current.vendorSettings.isSupported).toBe(false);
        expect(result.current.canReview).toBe(true);

        await submitTwice(result);
        expect((mocks.calls[0] as AdminProvisionEventRequestDto).moduleConfigs).toBeUndefined();
    });

    it('opens and closes the section', () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        expect(result.current.vendorSettings.open).toBe(false);
        act(() => result.current.vendorSettings.toggleOpen());
        expect(result.current.vendorSettings.open).toBe(true);
        act(() => result.current.vendorSettings.reset());
        expect(result.current.vendorSettings.open).toBe(false);
    });
});

describe('useProvisionEventForm pre-configuration', () => {
    const VALID_IBAN = 'GR16 0110 1250 0000 0001 2300 695';

    it('sends the subtitle and end time, and blocks an end before the start', async () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => {
            fillRequired(result.current);
            result.current.setSubtitle('  Join us  ');
            result.current.setEndAt('2999-06-01T11:00');
        });
        expect(result.current.endAtError).toBe('validation.endBeforeStart');
        expect(result.current.canReview).toBe(false);

        act(() => result.current.setEndAt('2999-06-01T23:00'));
        expect(result.current.canReview).toBe(true);
        await submitTwice(result);
        const body = mocks.calls[0] as AdminProvisionEventRequestDto;
        expect(body.event.subtitle).toBe('Join us');
        expect(body.event.endAt).toBe(new Date('2999-06-01T23:00').toISOString());
    });

    it('sends the schedule and gift account when the plan includes them', async () => {
        mocks.moduleKeys = ['schedule', 'wishlist'];
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        act(() => result.current.schedule.openNew());
        act(() => {
            result.current.schedule.updateDraft('title', 'Reception');
            result.current.schedule.updateDraft('isSecondary', true);
        });
        act(() => result.current.schedule.save());
        act(() => {
            result.current.giftAccount.setField('iban', VALID_IBAN);
            result.current.giftAccount.setField('accountHolder', ' Maria P ');
            result.current.giftAccount.setField('bankName', 'Bank');
        });
        expect(result.current.schedule.allowsVenue).toBe(true);
        expect(result.current.canReview).toBe(true);

        await submitTwice(result);
        const body = mocks.calls[0] as AdminProvisionEventRequestDto;
        expect(body.schedule).toEqual([expect.objectContaining({ title: 'Reception', isSecondary: true })]);
        expect(body.giftAccount).toEqual({ iban: 'GR1601101250000000012300695', accountHolder: 'Maria P', bankName: 'Bank', note: undefined });
    });

    it('blocks review on a half-filled gift account or a bad IBAN', () => {
        mocks.moduleKeys = ['wishlist'];
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        act(() => result.current.giftAccount.setField('bankName', 'Bank'));
        expect(result.current.canReview).toBe(false);
        act(() => {
            result.current.giftAccount.setField('iban', 'GR00 0110 1250 0000 0001 2300 695');
            result.current.giftAccount.setField('accountHolder', 'Maria');
        });
        expect(result.current.giftAccount.ibanError).toBe(true);
        expect(result.current.canReview).toBe(false);
    });

    it('sends neither when the plan lacks the schedule and wishlist', async () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        act(() => result.current.giftAccount.setField('bankName', 'Bank'));
        expect(result.current.canReview).toBe(true);
        await submitTwice(result);
        const body = mocks.calls[0] as AdminProvisionEventRequestDto;
        expect(body.schedule).toBeUndefined();
        expect(body.giftAccount).toBeUndefined();
    });
});
