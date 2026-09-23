'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppNewsletterConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { NewsletterStatusResponseDto, NewsletterTokenRequestDto, NewsletterUpdateRequestDto } from '@/lib/api/types';
import { newsletterKeys } from '@/lib/newsletter';

const COPIED_RESET_MS = 1500;

// Marks a token page as already handled, so a refresh shows the result
// instead of POSTing the token a second time.
const DONE_PARAM = 'done';

export type NewsletterTokenAction = 'confirm' | 'unsubscribe';
export type NewsletterTokenState = 'pending' | 'done' | 'missing-token' | 'error';

// Both endpoints answer 204 for any token, including unknown or spent ones, so
// the only failures are transport ones (rate limit, feature switched off).
export function useNewsletterTokenAction(action: NewsletterTokenAction) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations('NewsletterPage');
    const toErrorMessage = useApiErrorMessage();
    const token = searchParams.get('token')?.trim() ?? '';
    const isAlreadyDone = searchParams.has(DONE_PARAM);
    const [state, setState] = useState<NewsletterTokenState>('pending');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const hasPosted = useRef(false);

    useEffect(() => {
        if (!token || isAlreadyDone || hasPosted.current) return;
        hasPosted.current = true;

        const body: NewsletterTokenRequestDto = { token };
        void api.post<void>(endpoints.newsletter[action], body).then(
            () => {
                setState('done');
                router.replace(`${pathname}?${DONE_PARAM}=1`);
            },
            (error: unknown) => {
                // 404 means the newsletter is switched off, not that the token is bad.
                setErrorMessage(error instanceof ApiError && error.status === 404 ? t('unavailableDescription') : toErrorMessage(error));
                setState('error');
            }
        );
    }, [action, isAlreadyDone, pathname, router, t, toErrorMessage, token]);

    if (isAlreadyDone) return { errorMessage: null, state: 'done' as const };
    if (!token && state === 'pending') return { errorMessage: null, state: 'missing-token' as const };
    return { errorMessage, state };
}

export function useNewsletterStatus(enabled: boolean) {
    return useQuery({
        queryKey: newsletterKeys.status,
        queryFn: () => api.get<NewsletterStatusResponseDto>(endpoints.me.newsletter),
        enabled,
    });
}

// Profile settings: guests have no address of their own, so they never see it.
export function useNewsletterSettings() {
    const config = useAppNewsletterConfig();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();
    const canManage = Boolean(config) && (user?.role === 'USER' || user?.role === 'ADMIN');
    const statusQuery = useNewsletterStatus(canManage);
    const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const mutation = useMutation({
        mutationFn: (subscribed: boolean) => {
            const body: NewsletterUpdateRequestDto = { subscribed };
            return api.put<void>(endpoints.me.newsletter, body);
        },
        // An unverified address gets a confirmation email instead of an
        // immediate subscription, so re-fetch rather than assume the outcome.
        onSuccess: async (_, subscribed) => {
            const status = await queryClient.fetchQuery({
                queryKey: newsletterKeys.status,
                queryFn: () => api.get<NewsletterStatusResponseDto>(endpoints.me.newsletter),
                staleTime: 0,
            });
            setIsAwaitingConfirmation(subscribed && !status.subscribed);
        },
    });

    const { mutate } = mutation;
    const subscribe = useCallback(() => mutate(true), [mutate]);
    const unsubscribe = useCallback(() => mutate(false), [mutate]);

    const isSubscribed = statusQuery.data?.subscribed ?? false;
    const statusKind: 'subscribed' | 'awaitingConfirmation' | 'offer' = isSubscribed ? 'subscribed' : isAwaitingConfirmation ? 'awaitingConfirmation' : 'offer';

    const rewardCode = statusQuery.data?.rewardCode ?? null;
    const copyRewardCode = useCallback(async () => {
        if (!rewardCode) return;
        await navigator.clipboard.writeText(rewardCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), COPIED_RESET_MS);
    }, [rewardCode]);

    return {
        canManage,
        config,
        copyRewardCode,
        error: mutation.error ? toErrorMessage(mutation.error) : null,
        isCopied,
        isLoading: statusQuery.isLoading,
        isSaving: mutation.isPending,
        isSubscribed,
        loadError: statusQuery.error ? toErrorMessage(statusQuery.error) : null,
        status: statusQuery.data ?? null,
        statusKind,
        subscribe,
        unsubscribe,
    };
}
