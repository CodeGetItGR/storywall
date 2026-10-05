import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventDetailResponseDto, EventModuleResponseDto, EventScheduleDto, EventStatus } from '@/lib/api/types';

import OverviewTab from './OverviewTab';

// Unlike OverviewTab.test.tsx, ThemePicker and useThemePicker are NOT mocked here: that mock
// hid the picker never rendering on a draft. Only the data hooks and unrelated panels are.
const mocks = vi.hoisted(() => ({ presetsArg: undefined as string | null | undefined }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/hooks/useEventTheme', () => ({
    useEventThemePresets: (eventId: string | null) => {
        mocks.presetsArg = eventId;
        return {
            data: eventId
                ? [
                      {
                          id: 'p1',
                          key: 'dino-mint',
                          name: { en: 'Dino', el: 'Dino' },
                          backgroundColor: '#BFE6E2',
                          illustrationUrl: 'https://media.example/dino.webp',
                      },
                  ]
                : undefined,
            isLoading: false,
            error: null,
        };
    },
    useSetEventTheme: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, variables: undefined, error: null }),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => <span /> }));
vi.mock('@/hooks/useEventOverviewPlan', () => ({
    useEventOverviewPlan: () => ({
        currentPlan: undefined,
        currentOption: null,
        savedOptionId: null,
        durationOptions: [],
        durationUnavailable: false,
        selectedAddons: [],
        activationTotal: null,
        isBillingLoading: false,
        wishlistAvailable: false,
    }),
}));
vi.mock('@/hooks/useRightContextPanel', () => ({ useRightContextPanel: () => ({}) }));
vi.mock('@/components/layout/right-context-panel/HostContextSections', () => ({ HostContextSections: () => null }));
vi.mock('@/components/manage/CoverageStatusStrip', () => ({ CoverageStatusStrip: () => null }));
vi.mock('@/components/manage/ManageSkeletons', () => ({ ManageDraftOverviewSkeleton: () => null }));
vi.mock('@/components/ui/MetricStrip', () => ({ MetricStrip: () => null }));
vi.mock('@/components/manage/OverviewDraftPanel', () => ({
    OverviewDraftPanel: ({ themeSection }: { themeSection?: ReactNode }) => <div data-testid="draft-panel">{themeSection}</div>,
}));

const schedule = { startAt: '2026-11-01T10:00:00Z', endAt: null, projectedCoverage: null } as unknown as EventScheduleDto;

function renderDraft(modules: Partial<EventModuleResponseDto>[]) {
    const status: EventStatus = 'DRAFT';
    const event = { id: 'e1', status, modules, deletedAt: null, suspended: false, schedule, theme: null } as unknown as EventDetailResponseDto;
    render(
        <OverviewTab
            event={event}
            memberCount={0}
            daysToGo={10}
            pendingCoHostInvitationCount={0}
            seatsClaimed={null}
            eventUsage={null}
            planTiers={[]}
            paidServices={[]}
            modules={[]}
            eventModules={[]}
            eventId="e1"
            eventTitle="Baptism"
            eventType="BAPTISM"
            eventStatus={status}
            schedule={schedule}
            cancelledCheckout={false}
            canPurchase
        />,
    );
}

afterEach(() => {
    cleanup();
    mocks.presetsArg = undefined;
});

describe('OverviewTab with the real ThemePicker', () => {
    it('renders the picker on a DRAFT whose theme row is enabled but not available', () => {
        renderDraft([{ moduleKey: 'theme', isAvailable: false, isEnabled: true }]);
        expect(screen.getByRole('radiogroup')).toBeInTheDocument();
        expect(mocks.presetsArg).toBe('e1');
    });

    it('renders nothing when the theme row is missing or not enabled', () => {
        renderDraft([]);
        expect(screen.queryByRole('radiogroup')).toBeNull();
        cleanup();
        renderDraft([{ moduleKey: 'theme', isAvailable: false, isEnabled: false }]);
        expect(screen.queryByRole('radiogroup')).toBeNull();
        expect(mocks.presetsArg).toBeNull();
    });
});
