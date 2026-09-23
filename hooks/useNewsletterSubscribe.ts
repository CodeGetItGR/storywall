'use client';

import { useLocale } from 'next-intl';
import type { ChangeEvent, SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { isRateLimitedError } from '@/lib/api/errors';
import type { NewsletterSubscribeRequestDto } from '@/lib/api/types';

// Kept apart from useNewsletter.ts because the landing footer imports it, and
// the landing page only ships a small, allowlisted set of translations.

export type NewsletterSubscribeError = 'invalid' | 'rateLimited' | 'failed';

function toSubscribeError(error: unknown): NewsletterSubscribeError {
    if (isRateLimitedError(error)) return 'rateLimited';
    if (error instanceof ApiError && error.status === 400) return 'invalid';
    return 'failed';
}

// POST /api/newsletter/subscribe always answers 202 whatever the address's
// history, so there is exactly one success state: "check your inbox".
export function useNewsletterSubscribe() {
    const locale = useLocale();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState<NewsletterSubscribeError | null>(null);

    const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value);
        setError(null);
    }, []);

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;
        setError(null);
        setIsSubmitting(true);

        try {
            const body: NewsletterSubscribeRequestDto = { email: email.trim(), locale };
            await api.post<void>(endpoints.newsletter.subscribe, body);
            setIsSent(true);
        } catch (submitError) {
            setError(toSubscribeError(submitError));
        } finally {
            setIsSubmitting(false);
        }
    }

    return { email, error, handleEmailChange, handleSubmit, isSent, isSubmitting };
}
