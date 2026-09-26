import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { computeHasUnansweredSessions, useRsvpSessionQuestions } from '@/hooks/useRsvpSessionQuestions';
import { ApiError } from '@/lib/api/client';

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));

let modulesAvailable = true;
vi.mock('@/lib/eventLifecycle', () => ({ isModuleAvailable: () => modulesAvailable }));

const defaultSessions = [
    { id: 'reception', title: 'Reception', displayOrder: 1, rsvpEnabled: true, startAt: null },
    { id: 'ceremony', title: 'Ceremony', displayOrder: 0, rsvpEnabled: true, startAt: null },
    { id: 'brunch', title: 'Brunch', displayOrder: 2, rsvpEnabled: false, startAt: null },
];
let sessionsData: typeof defaultSessions | undefined = defaultSessions;
let sessionsIsPending = false;
let sessionsFetchStatus: 'idle' | 'fetching' | 'paused' = 'idle';
vi.mock('@/hooks/useEventSessions', () => ({
    useEventSessions: () => ({ data: sessionsData, isPending: sessionsIsPending, fetchStatus: sessionsFetchStatus }),
}));

const mutateAsync = vi.fn();
vi.mock('@/hooks/useRsvps', () => ({
    useCreateRsvpSessionResponse: () => ({ mutateAsync }),
}));

beforeEach(() => {
    modulesAvailable = true;
    sessionsData = defaultSessions;
    sessionsIsPending = false;
    sessionsFetchStatus = 'idle';
    mutateAsync.mockReset().mockResolvedValue({});
});

describe('useRsvpSessionQuestions', () => {
    it('asks only the open sessions, in display order', () => {
        const { result } = renderHook(() => useRsvpSessionQuestions('e1', []));

        expect(result.current.questions.map((q) => q.id)).toEqual(['ceremony', 'reception']);
    });

    it('is incomplete until every question is answered', () => {
        const { result } = renderHook(() => useRsvpSessionQuestions('e1', []));
        expect(result.current.allAnswered).toBe(false);

        act(() => result.current.onAnswer('ceremony', true));
        expect(result.current.allAnswered).toBe(false);

        act(() => result.current.onAnswer('reception', false));
        expect(result.current.allAnswered).toBe(true);
    });

    it('sends every answered session', async () => {
        const { result } = renderHook(() => useRsvpSessionQuestions('e1', []));
        act(() => result.current.onAnswer('ceremony', true));
        act(() => result.current.onAnswer('reception', true));

        await act(() => result.current.submitAnswers('rsvp-1'));

        expect(mutateAsync).toHaveBeenCalledTimes(2);
        expect(mutateAsync).toHaveBeenCalledWith({ rsvpId: 'rsvp-1', eventSessionId: 'ceremony', isAttending: true });
        expect(mutateAsync).toHaveBeenCalledWith({ rsvpId: 'rsvp-1', eventSessionId: 'reception', isAttending: true });
    });

    it('is not answered while the sessions list is still loading', () => {
        sessionsIsPending = true;
        sessionsFetchStatus = 'fetching';
        sessionsData = undefined;

        const { result } = renderHook(() => useRsvpSessionQuestions('e1', []));

        expect(result.current.isReady).toBe(false);
        expect(result.current.allAnswered).toBe(false);
    });

    it('is not answered while the sessions query is paused offline', () => {
        sessionsIsPending = true;
        sessionsFetchStatus = 'paused';
        sessionsData = undefined;

        const { result } = renderHook(() => useRsvpSessionQuestions('e1', []));

        expect(result.current.isReady).toBe(false);
        expect(result.current.allAnswered).toBe(false);
    });

    it('treats a failed sessions load as ready with no questions, so the guest is never stuck', () => {
        sessionsIsPending = false;
        sessionsFetchStatus = 'idle';
        sessionsData = undefined;

        const { result } = renderHook(() => useRsvpSessionQuestions('e1', []));

        expect(result.current.isReady).toBe(true);
        expect(result.current.questions).toEqual([]);
        expect(result.current.allAnswered).toBe(true);
    });

    it('is fully answered when the modules are unavailable, regardless of load state', () => {
        modulesAvailable = false;
        sessionsIsPending = true;
        sessionsFetchStatus = 'fetching';

        const { result } = renderHook(() => useRsvpSessionQuestions('e1', []));

        expect(result.current.questions).toEqual([]);
        expect(result.current.allAnswered).toBe(true);
    });

    it('swallows a "session closed", "RSVP not attending" or "deleted session" (404) answer failure', async () => {
        const { result } = renderHook(() => useRsvpSessionQuestions('e1', []));
        act(() => result.current.onAnswer('ceremony', true));
        act(() => result.current.onAnswer('reception', false));

        mutateAsync.mockImplementation(({ eventSessionId }: { eventSessionId: string }) => {
            if (eventSessionId === 'ceremony') return Promise.reject(new ApiError(409, { errorCode: 5086 }));
            return Promise.reject(new ApiError(404, { errorCode: 2001 }));
        });

        await expect(result.current.submitAnswers('rsvp-1')).resolves.toBeUndefined();
    });

    it('rethrows an answer failure that is not one of the expected races', async () => {
        const { result } = renderHook(() => useRsvpSessionQuestions('e1', []));
        act(() => result.current.onAnswer('ceremony', true));

        mutateAsync.mockRejectedValue(new ApiError(500, { errorCode: 9001 }));

        await expect(result.current.submitAnswers('rsvp-1')).rejects.toBeInstanceOf(ApiError);
    });
});

describe('computeHasUnansweredSessions', () => {
    it('is true only when attending and not every question is answered', () => {
        expect(computeHasUnansweredSessions('attending', false)).toBe(true);
        expect(computeHasUnansweredSessions('attending', true)).toBe(false);
        expect(computeHasUnansweredSessions('not-attending', false)).toBe(false);
        expect(computeHasUnansweredSessions(null, false)).toBe(false);
    });
});
