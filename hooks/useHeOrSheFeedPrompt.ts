'use client';

import { useRouter } from 'next/navigation';

import { useHeOrShe, useSendHeOrSheAnswers } from '@/hooks/useHeOrShe';
import type { HeOrSheValue } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { useContentAccessMode } from '@/providers/EventProvider';

/**
 * The feed's Boy or Girl? prompt: shown while guessing is open and the member hasn't guessed.
 * A guess is saved from the feed; with extra questions to answer it then opens the page.
 */
export function useHeOrSheFeedPrompt(eventId: string, enabled: boolean) {
    const router = useRouter();
    // The public demo's mock backend has no Boy or Girl? handlers (v1).
    const isDemoVisitor = useContentAccessMode() === 'demoVisitor';
    const view = useHeOrShe(enabled && !isDemoVisitor ? eventId : null).data;
    const send = useSendHeOrSheAnswers(eventId);

    const revealTime = view?.revealAt ? Date.parse(view.revealAt) : Number.NaN;
    const visible = Boolean(view && view.status === 'OPEN' && view.canGuess && view.myGuess === null);

    async function guess(value: HeOrSheValue) {
        if (!view || send.isPending) return;
        // PUT /answers replaces the whole set: keep any answers already given.
        const answers = Object.entries(view.myAnswers).map(([questionId, answer]) => ({ questionId, value: answer }));
        const hasQuestions = view.questions.length > 0;
        try {
            await send.mutateAsync({ guess: value, answers });
        } catch {
            return; // send.error shows on the card
        }
        if (hasQuestions) router.push(routes.events.tools.heOrShe(eventId));
    }

    return {
        visible,
        // Epoch ms of the scheduled reveal, for the countdown; null when the host reveals by hand.
        revealTime: Number.isNaN(revealTime) ? null : revealTime,
        isSending: send.isPending,
        error: send.error,
        guess,
    };
}
