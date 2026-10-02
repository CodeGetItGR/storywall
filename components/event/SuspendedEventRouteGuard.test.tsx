import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SuspendedEventRouteGuard } from '@/components/event/SuspendedEventRouteGuard';
import type { EventDetailResponseDto, EventSuspensionDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({ event: null as Partial<EventDetailResponseDto> | null, routeEventId: 'e-1' as string | null }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => state.event, useRouteEventId: () => state.routeEventId }));
const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
    usePathname: () => '/events/e-1/feed',
    useSearchParams: () => new URLSearchParams(nav.search),
}));
// The real BillingTab loads billing data; here it only reports the props it was given.
vi.mock('@/app/(main)/(app)/(event)/events/[eventId]/manage/BillingTab', () => ({
    default: (props: Record<string, unknown>) => <div>{`billing-tab ${JSON.stringify(props)}`}</div>,
}));

afterEach(() => {
    cleanup();
    nav.search = '';
    state.routeEventId = 'e-1';
});

const suspension: EventSuspensionDto = {
    suspendedAt: '2026-10-02T10:00:00Z',
    ground: 'GUIDELINES_BREACH',
    rule: 'HARASSMENT',
    explanation: 'Insults aimed at one guest, twice.',
    reference: 'AB12CD34',
    closedAt: null,
    deletesOn: null,
    contactEmail: 'reports@example.test',
    primaryHost: true,
};

const suspendedEvent: Partial<EventDetailResponseDto> = {
    id: 'e-1',
    title: 'Maria & Nikos',
    schedule: {
        startAt: '2026-10-10T16:00:00Z',
        endAt: null,
        coverageEndsAt: null,
        projectedCoverage: null,
        timezone: 'Europe/Athens',
        rsvpDeadline: null,
    },
    suspended: true,
    suspension,
};

describe('SuspendedEventRouteGuard', () => {
    it('renders the page when the event is not suspended', () => {
        state.event = { ...suspendedEvent, suspended: false, suspension: null };
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
    });

    it('renders the page while no event is loaded', () => {
        state.event = null;
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
    });

    it('replaces the page with the reason, the rule link and the redress', () => {
        state.event = suspendedEvent;
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.queryByText('page')).toBeNull();
        expect(screen.getByRole('heading', { name: 'title' })).toBeTruthy();
        expect(screen.getByText('grounds.GUIDELINES_BREACH')).toBeTruthy();
        expect(screen.getByText('rules.HARASSMENT')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'readRule' }).getAttribute('href')).toBe('/legal/community-guidelines#section-6');
        expect(screen.getByText('Insults aimed at one guest, twice.')).toBeTruthy();
        expect(screen.getByText('humanDecision')).toBeTruthy();
        expect(screen.getByText('redressWithContact {"email":"reports@example.test","reference":"AB12CD34"}')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'back' }).getAttribute('href')).toBe('/home');
    });

    it('still explains itself when the decision behind it is gone and no contact is configured', () => {
        state.event = {
            ...suspendedEvent,
            suspension: { ...suspension, ground: null, rule: null, explanation: null, contactEmail: null },
        };
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.getByRole('heading', { name: 'title' })).toBeTruthy();
        expect(screen.queryByRole('link', { name: 'readRule' })).toBeNull();
        expect(screen.getByText('redressWithoutContact')).toBeTruthy();
    });

    it('leaves a route that does not name the event alone, even if the remembered event is suspended', () => {
        state.routeEventId = null;
        state.event = suspendedEvent;
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
    });

    it('says when a closed StoryWall will be deleted', () => {
        state.event = {
            ...suspendedEvent,
            suspension: { ...suspension, closedAt: '2026-10-03T10:00:00Z', deletesOn: '2026-11-02T10:00:00Z' },
        };
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.queryByText('page')).toBeNull();
        expect(screen.getByRole('heading', { name: 'closedTitle' })).toBeTruthy();
        expect(screen.getByText(/^closedBody \{.*"deletesOn"/)).toBeTruthy();
        expect(screen.queryByText(/^body /)).toBeNull();
        // The statement and the redress still show: closing restates the same decision.
        expect(screen.getByText('rules.HARASSMENT')).toBeTruthy();
        expect(screen.getByText(/^redressWithContact /)).toBeTruthy();
    });

    it('moves focus to the heading when it takes over, and labels the landmark with it', () => {
        state.event = suspendedEvent;
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        const heading = screen.getByRole('heading', { name: 'title' });
        expect(document.activeElement).toBe(heading);
        expect(screen.getByRole('region', { name: 'title' })).toBeTruthy();
    });

    it('offers the primary host the billing and withdrawal page', () => {
        state.event = suspendedEvent;
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.getByRole('link', { name: 'billingLink' }).getAttribute('href')).toBe('/events/e-1/feed?view=billing');
    });

    it('offers a co-host no billing link', () => {
        state.event = { ...suspendedEvent, suspension: { ...suspension, primaryHost: false } };
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.queryByRole('link', { name: 'billingLink' })).toBeNull();
    });

    it('shows the primary host only the billing tab, without purchases, in billing mode', () => {
        nav.search = 'view=billing';
        state.event = suspendedEvent;
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.queryByText('page')).toBeNull();
        expect(screen.queryByRole('heading', { name: 'title' })).toBeNull();
        expect(screen.getByRole('heading', { name: 'billingTitle' })).toBeTruthy();
        const tab = screen.getByText(/^billing-tab /).textContent ?? '';
        expect(tab).toContain('"eventId":"e-1"');
        expect(tab).toContain('"canPurchase":true');
        expect(tab).toContain('"withdrawalOnly":true');
        expect(screen.getByRole('link', { name: 'billingBack' }).getAttribute('href')).toBe('/events/e-1/feed');
    });

    it('treats a closed (soft-deleted) StoryWall as deleted on the billing tab', () => {
        nav.search = 'view=billing';
        state.event = { ...suspendedEvent, deletedAt: '2026-10-03T10:00:00Z' };
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.getByText(/^billing-tab /).textContent).toContain('"isDeleted":true');
    });

    it('keeps a co-host on the suspended view in billing mode', () => {
        nav.search = 'view=billing';
        state.event = { ...suspendedEvent, suspension: { ...suspension, primaryHost: false } };
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.getByRole('heading', { name: 'title' })).toBeTruthy();
        expect(screen.queryByText(/^billing-tab /)).toBeNull();
    });

    it('ignores billing mode when the event is not suspended', () => {
        nav.search = 'view=billing';
        state.event = { ...suspendedEvent, suspended: false, suspension: null };
        render(<SuspendedEventRouteGuard>page</SuspendedEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
    });
});
