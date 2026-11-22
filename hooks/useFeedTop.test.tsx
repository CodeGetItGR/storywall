import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { produce } from 'immer';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useFeedTop } from '@/hooks/useFeedTop';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { defaultFeedLayout, feedLayoutKeys } from '@/lib/feedLayout';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import { FeedEditorFlagProvider } from '@/providers/FeedEditorFlagProvider';

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
vi.mock('@/hooks/useAdminInvitationThemes', () => ({ useInvitationFonts: () => ({ data: [] }) }));

// An event that has ended: the read-only feed keeps only the cover and details.
const event = { id: 'e-1', theme: null, description: null, schedule: { endAt: '2020-01-01T00:00:00Z' } } as unknown as EventDetailResponseDto;

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(feedLayoutKeys.detail('e-1'), null);
    return (
        <QueryClientProvider client={client}>
            <FeedEditorFlagProvider enabled>{children}</FeedEditorFlagProvider>
        </QueryClientProvider>
    );
}

describe('useFeedTop while editing', () => {
    const dressCode = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'dress' };
    const base = defaultFeedLayout();
    const editing = produce({ ...base, sections: [...base.sections, dressCode] }, (draft) => {
        draft.sections[2].visible = false;
    });

    it('draws the edited document with every block, never folded, even after the event', () => {
        const { result } = renderHook(() => useFeedTop(event, editing), { wrapper });
        expect(result.current.frame.middle.map((section) => section.id)).toEqual(['feed-feedDescription', 'dress']);
        expect(result.current.frame.rsvp?.type).toBe('feedRsvp');
        expect(result.current.folds).toBe(false);
        expect(result.current.look).toBe(true);
        expect(result.current.sections).toBe(editing.sections);
    });

    it('keeps the read-only rules without it', () => {
        const { result } = renderHook(() => useFeedTop(event), { wrapper });
        expect(result.current.frame.middle).toEqual([]);
        expect(result.current.frame.rsvp).toBeNull();
    });
});
