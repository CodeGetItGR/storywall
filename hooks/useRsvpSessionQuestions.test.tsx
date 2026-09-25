import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRsvpSessionQuestions } from '@/hooks/useRsvpSessionQuestions';

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
vi.mock('@/lib/eventLifecycle', () => ({ isModuleAvailable: () => true }));

const sessions = [
    { id: 'reception', title: 'Reception', displayOrder: 1, rsvpEnabled: true, startAt: null },
    { id: 'ceremony', title: 'Ceremony', displayOrder: 0, rsvpEnabled: true, startAt: null },
    { id: 'brunch', title: 'Brunch', displayOrder: 2, rsvpEnabled: false, startAt: null },
];
vi.mock('@/hooks/useEventSessions', () => ({ useEventSessions: () => ({ data: sessions }) }));

let saved: { eventSessionId: string; isAttending: boolean }[] = [];
const requestedRsvpIds: (string | null)[] = [];
const mutateAsync = vi.fn();
vi.mock('@/hooks/useRsvps', () => ({
    useCreateRsvpSessionResponse: () => ({ mutateAsync }),
    useRsvpSessionResponses: (rsvpId: string | null) => {
        requestedRsvpIds.push(rsvpId);
        return { data: rsvpId ? saved : undefined };
    },
}));

beforeEach(() => {
    saved = [];
    requestedRsvpIds.length = 0;
    mutateAsync.mockReset().mockResolvedValue({});
});

describe('useRsvpSessionQuestions', () => {
    it('asks only the open sessions, in display order', () => {
        const { result } = renderHook(() => useRsvpSessionQuestions('e1', [], null));

        expect(result.current.questions.map((q) => q.id)).toEqual(['ceremony', 'reception']);
    });

    it('is incomplete until every question is answered', () => {
        const { result } = renderHook(() => useRsvpSessionQuestions('e1', [], null));
        expect(result.current.allAnswered).toBe(false);

        act(() => result.current.onAnswer('ceremony', true));
        expect(result.current.allAnswered).toBe(false);

        act(() => result.current.onAnswer('reception', false));
        expect(result.current.allAnswered).toBe(true);
    });

    it('pre-fills the answers already given', () => {
        saved = [
            { eventSessionId: 'ceremony', isAttending: true },
            { eventSessionId: 'reception', isAttending: false },
        ];

        const { result } = renderHook(() => useRsvpSessionQuestions('e1', [], 'rsvp-1'));

        expect(requestedRsvpIds).toContain('rsvp-1');
        expect(result.current.questions.map((q) => q.answer)).toEqual([true, false]);
        expect(result.current.allAnswered).toBe(true);
    });

    it('lets the guest change a pre-filled answer', () => {
        saved = [{ eventSessionId: 'ceremony', isAttending: true }];
        const { result } = renderHook(() => useRsvpSessionQuestions('e1', [], 'rsvp-1'));

        act(() => result.current.onAnswer('ceremony', false));

        expect(result.current.questions[0].answer).toBe(false);
    });

    it('sends every answer, the pre-filled ones included', async () => {
        saved = [{ eventSessionId: 'ceremony', isAttending: true }];
        const { result } = renderHook(() => useRsvpSessionQuestions('e1', [], 'rsvp-1'));
        act(() => result.current.onAnswer('reception', true));

        await act(() => result.current.submitAnswers('rsvp-1'));

        expect(mutateAsync).toHaveBeenCalledTimes(2);
        expect(mutateAsync).toHaveBeenCalledWith({ rsvpId: 'rsvp-1', eventSessionId: 'ceremony', isAttending: true });
        expect(mutateAsync).toHaveBeenCalledWith({ rsvpId: 'rsvp-1', eventSessionId: 'reception', isAttending: true });
    });
});
