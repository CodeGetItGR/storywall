import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProvisionEventForm } from '@/hooks/useProvisionEventForm';
import type { AdminProvisionEventRequestDto, PlanTierResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    moduleKeys: [] as string[],
    presetsArg: undefined as string | null | undefined,
    calls: [] as unknown[],
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
});
