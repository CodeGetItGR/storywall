'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useMe } from '@/hooks/useMe';
import { readPendingCreateEventPath } from '@/lib/pendingCreateEvent';

export const EMAIL_VERIFICATION_CHECK_MS = 10_000;

// The confirmation link opens in another tab or on another device, and nothing tells this tab. So while
// the email is unconfirmed, ask again every few seconds and whenever the tab comes back. Once confirmed,
// the page updates by itself, and someone stopped on the create form goes back to it with their plan.
export function useEmailVerificationWatch(): void {
    const router = useRouter();
    const { user } = useAuth();
    const { refetch } = useMe();
    const isWaiting = user?.emailVerified === false;
    const wasWaiting = useRef(false);

    useEffect(() => {
        if (!isWaiting) return;
        const check = () => {
            if (document.visibilityState === 'visible') void refetch();
        };
        const timer = window.setInterval(check, EMAIL_VERIFICATION_CHECK_MS);
        window.addEventListener('focus', check);
        document.addEventListener('visibilitychange', check);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('focus', check);
            document.removeEventListener('visibilitychange', check);
        };
    }, [isWaiting, refetch]);

    useEffect(() => {
        if (isWaiting) {
            wasWaiting.current = true;
            return;
        }
        if (!wasWaiting.current || user?.emailVerified !== true) return;
        wasWaiting.current = false;
        const pendingPath = readPendingCreateEventPath();
        if (pendingPath) router.replace(pendingPath);
    }, [isWaiting, router, user?.emailVerified]);
}
