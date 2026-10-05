import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventDetailResponseDto, EventScheduleDto, EventStatus } from '@/lib/api/types';

import OverviewTab from './OverviewTab';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
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
vi.mock('@/components/manage/ThemePicker', () => ({
    ThemePicker: ({ event, canWrite }: { event: EventDetailResponseDto; canWrite: boolean }) => (
        <p data-testid="theme-picker">
            {event.id}:{String(canWrite)}
        </p>
    ),
}));

const schedule = { startAt: '2026-11-01T10:00:00Z', endAt: null, projectedCoverage: null } as unknown as EventScheduleDto;

function renderOverview(status: EventStatus) {
    const event = { id: 'e1', status, modules: [] } as unknown as EventDetailResponseDto;
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

afterEach(cleanup);

describe('OverviewTab', () => {
    it("offers the theme picker on a draft's overview, editable", () => {
        renderOverview('DRAFT');
        expect(screen.getByTestId('draft-panel')).toContainElement(screen.getByTestId('theme-picker'));
        expect(screen.getByTestId('theme-picker')).toHaveTextContent('e1:true');
    });

    it("leaves an active event's picker to the settings tab", () => {
        renderOverview('ACTIVE');
        expect(screen.queryByTestId('theme-picker')).toBeNull();
    });
});
