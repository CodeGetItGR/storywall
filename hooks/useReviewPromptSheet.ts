'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useHasOpenOverlay } from '@/hooks/useOverlayPresence';
import type { ReviewFormValues } from '@/hooks/useReviewForm';
import { useReviewPrompt } from '@/hooks/useReviewPrompt';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
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
    const { mutate: submitReview, isPending, error: submitError } = submit;
    const { mutate: dismissReview } = dismiss;
    const [open, setOpen] = useState(false);
    const [sent, setSent] = useState(false);

    // Adjusting state while rendering (not in an effect) avoids a frame with the sheet missing.
    if (!open && prompt && onPromptSurface && !hasOpenOverlay) {
        setOpen(true);
    }

    // Forget the prompt first, in the same update as closing: otherwise the
    // render-time check above would reopen the sheet while the dismiss is in flight.
    // The Modal ignores X, Esc and the backdrop while sending, so only Back gets here
    // mid-send: hide the sheet and let the rating finish, without a dismissal.
    const close = useCallback(() => {
        setOpen(false);
        if (!prompt) return;
        const { eventId } = prompt;
        forget();
        if (!sent && !isPending) dismissReview(eventId);
    }, [dismissReview, forget, isPending, prompt, sent]);

    const send = useCallback(
        (values: ReviewFormValues) => {
            if (!prompt) return;
            submitReview(
                { eventId: prompt.eventId, ...values },
                {
                    onSuccess: () => setSent(true),
                    // Rated on another device already: nothing left to ask.
                    onError: (error) => {
                        if (getErrorCode(error) !== ERROR_CODES.APP_REVIEW_NOT_ELIGIBLE) return;
                        setOpen(false);
                        forget();
                    },
                },
            );
        },
        [forget, prompt, submitReview],
    );

    return {
        prompt,
        open,
        sent,
        isSending: isPending,
        error: submitError && getErrorCode(submitError) !== ERROR_CODES.APP_REVIEW_NOT_ELIGIBLE ? toErrorMessage(submitError) : null,
        close,
        send,
    };
}
