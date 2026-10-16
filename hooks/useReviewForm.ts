'use client';

import { type ChangeEvent, useCallback, useState } from 'react';

import { canOfferPublicConsent } from '@/lib/reviews';

export type ReviewFormValues = { stars: number; comment: string | null; publicConsent: boolean };

export function useReviewForm(onSubmitAction: (values: ReviewFormValues) => void) {
    const [stars, setStars] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const [consent, setConsent] = useState(false);
    const showConsent = canOfferPublicConsent(stars, comment);

    const handleCommentChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setComment(event.target.value), []);
    const handleConsentChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setConsent(event.target.checked), []);

    const handleSubmit = useCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (stars === null) return;
            onSubmitAction({ stars, comment: comment.trim() || null, publicConsent: showConsent && consent });
        },
        [comment, consent, onSubmitAction, showConsent, stars],
    );

    return { stars, setStars, comment, consent, showConsent, canSend: stars !== null, handleCommentChange, handleConsentChange, handleSubmit };
}
