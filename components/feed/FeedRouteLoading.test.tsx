import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedRouteLoading } from '@/components/feed/FeedRouteLoading';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

const context = vi.hoisted(() => ({ event: null as object | null, routeEventId: 'e-1' }));
vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => context.event, useRouteEventId: () => context.routeEventId }));
vi.mock('next/navigation', () => ({ usePathname: () => '/events/e-1/feed', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/components/feed/FeedPageSkeleton', () => ({ FeedPageSkeleton: ({ header = 'unknown' }: { header?: string }) => <p>{header}</p> }));

const event = (modules: object[]) => ({ id: 'e-1', modules, schedule: { startAt: '2099-06-01T15:00:00Z', timezone: 'Europe/Athens' }, sessions: [] });

function header(activeEvent: object | null) {
    context.event = activeEvent;
    render(
        <FeedEditorFlagProvider enabled>
            <FeedRouteLoading />
        </FeedEditorFlagProvider>,
    );
    return screen.getByRole('paragraph').textContent;
}

afterEach(cleanup);

describe('FeedRouteLoading', () => {
    it('has no header on the way to an invitation', () => {
        expect(header(event([{ moduleKey: 'save_my_date', isAvailable: true }]))).toBe('hidden');
    });

    it('has the header on the way to the one page', () => {
        expect(header(event([]))).toBe('shown');
    });

    it("draws no header while the event isn't known, or is another one", () => {
        expect(header(null)).toBe('unknown');
        cleanup();
        expect(header({ ...event([]), id: 'e-2' })).toBe('unknown');
    });
});
