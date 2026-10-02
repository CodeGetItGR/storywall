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

afterEach(cleanup);

function item(eventId: string, suspended: boolean): EventGridItem {
    return {
        member: { eventId, role: 'HOST', relationshipRole: null, customRelationshipRole: null } as unknown as EventGridItem['member'],
        event: {
            id: eventId,
            title: `Event ${eventId}`,
            schedule: { startAt: '2026-10-10T16:00:00Z' },
            coverMedia: null,
            deletedAt: null,
            deletionScheduledFor: null,
            suspended,
            suspension: null,
        } as unknown as EventGridItem['event'],
        isLoading: false,
    };
}

describe('EventsQuickRow', () => {
    it('badges a suspended StoryWall and only that one', () => {
        render(<EventsQuickRow items={[item('e-1', true), item('e-2', false)]} />);
        expect(screen.getAllByText('suspended')).toHaveLength(1);
        expect(screen.getByRole('link', { name: /Event e-1/ }).textContent).toContain('suspended');
    });
});
