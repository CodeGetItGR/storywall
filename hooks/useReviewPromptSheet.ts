'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useHasOpenOverlay } from '@/hooks/useOverlayPresence';
import type { ReviewFormValues } from '@/hooks/useReviewForm';
import { useReviewPrompt } from '@/hooks/useReviewPrompt';
import { isReviewPromptRoute } from '@/lib/reviews';

// Opens the sheet once, on home or an event feed, when nothing else is open.
// Once open it stays open: the sheet itself counts as an open overlay.
// Closing before sending is a dismissal; closing after sending just hides it.
export function useReviewPromptSheet() {
    const pathname = usePathname();
    const { user } = useAuth();
    const hasOpenOverlay = useHasOpenOverlay();
    const toErrorMessage = useApiErrorMessage();
    const onPromptSurface = Boolean(user) && user?.role !== 'ADMIN' && isReviewPromptRoute(pathname);
    const { prompt, submit, dismiss, forget } = useReviewPrompt(onPromptSurface);
    const [open, setOpen] = useState(false);
    const [sent, setSent] = useState(false);

    // Adjusting state while rendering (not in an effect) avoids a frame with the sheet missing.
    if (!open && prompt && onPromptSurface && !hasOpenOverlay) {
        setOpen(true);
    }

    // Forget the prompt first, in the same update as closing: otherwise the
    // render-time check above would reopen the sheet while the dismiss is in flight.
    const close = useCallback(() => {
        setOpen(false);
        if (!prompt) return;
        const { eventId } = prompt;
        forget();
        if (!sent) dismiss.mutate(eventId);
    }, [dismiss, forget, prompt, sent]);

    const send = useCallback(
        (values: ReviewFormValues) => {
            if (!prompt) return;
            submit.mutate({ eventId: prompt.eventId, ...values }, { onSuccess: () => setSent(true) });
        },
        [prompt, submit],
    );

    return {
        prompt,
        open,
        sent,
        isSending: submit.isPending,
        error: submit.error ? toErrorMessage(submit.error) : null,
        close,
        send,
    };
}
