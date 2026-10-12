import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventsQuickRow } from '@/components/home/EventsQuickRow';
import type { EventGridItem } from '@/hooks/useEventGridItems';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));
vi.mock('@/components/home/HomeHorizontalScroller', () => ({
    HomeHorizontalScroller: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: () => null }));
vi.mock('@/hooks/useMemberRoleLabel', () => ({ useMemberRoleLabel: () => null }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({ useLocalizedAppEventTypeCopy: () => () => ({ name: 'Wedding' }) }));

afterEach(cleanup);

type ItemOverrides = Partial<{ suspended: boolean; status: 'DRAFT' | 'ACTIVE'; deletedAt: string | null; endAt: string | null }>;

function item(eventId: string, overrides: ItemOverrides = {}): EventGridItem {
    return {
        member: { eventId, role: 'HOST', relationshipRole: null, customRelationshipRole: null } as unknown as EventGridItem['member'],
        event: {
            id: eventId,
            title: `Event ${eventId}`,
            eventType: 'WEDDING',
            status: overrides.status ?? 'ACTIVE',
            schedule: { startAt: '2099-10-10T16:00:00Z', endAt: overrides.endAt ?? null },
            coverMedia: null,
            deletedAt: overrides.deletedAt ?? null,
            deletionScheduledFor: overrides.deletedAt ? '2099-11-01T00:00:00Z' : null,
            suspended: overrides.suspended ?? false,
            suspension: null,
        } as unknown as EventGridItem['event'],
        isLoading: false,
    };
}

function cardFor(eventId: string) {
    return screen.getByRole('link', { name: new RegExp(`Event ${eventId}`) });
}

describe('EventsQuickRow', () => {
    it('badges a suspended StoryWall and only that one', () => {
        render(<EventsQuickRow items={[item('e-1', { suspended: true }), item('e-2')]} />);
        expect(screen.getAllByText('status.suspended')).toHaveLength(1);
        expect(cardFor('e-1').textContent).toContain('status.suspended');
    });

    it('shows the event type and role on every card', () => {
        render(<EventsQuickRow items={[item('e-1'), item('e-2')]} />);
        expect(screen.getAllByText('Wedding · roleFallback.host')).toHaveLength(2);
    });

    it('flags draft, ended and deleting events but not a live one', () => {
        render(
            <EventsQuickRow
                items={[
                    item('live'),
                    item('draft', { status: 'DRAFT' }),
                    item('ended', { endAt: '2000-01-01T00:00:00Z' }),
                    item('gone', { deletedAt: '2026-10-01T00:00:00Z' }),
                ]}
            />,
        );
        expect(cardFor('live').textContent).not.toContain('status.');
        expect(cardFor('draft').textContent).toContain('status.draft');
        expect(cardFor('ended').textContent).toContain('status.ended');
        expect(cardFor('gone').textContent).toContain('status.deleting');
    });
});
