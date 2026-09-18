'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { getPostAuthRedirectPath } from '@/lib/auth/returnPath';

export function useAuthPageRedirect(returnPath: string | null = null) {
    const router = useRouter();
    const { isAuthenticated, isBootstrapping, user } = useAuth();
    const authenticatedRedirectPath = user ? getPostAuthRedirectPath(user.role, returnPath) : null;

    useEffect(() => {
        if (isBootstrapping || !isAuthenticated || !authenticatedRedirectPath) return;
        router.replace(authenticatedRedirectPath);
    }, [authenticatedRedirectPath, isAuthenticated, isBootstrapping, router]);

    return {
        shouldRenderAuthPage: !isBootstrapping && !isAuthenticated,
    };
}
