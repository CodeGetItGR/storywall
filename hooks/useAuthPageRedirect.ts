'use client';

import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useNavigateAfterSignIn } from '@/hooks/useNavigateAfterSignIn';
import { getPostAuthRedirectPath } from '@/lib/auth/returnPath';

export function useAuthPageRedirect(returnPath: string | null = null) {
    const navigateAfterSignIn = useNavigateAfterSignIn();
    const { isAuthenticated, isBootstrapping, user } = useAuth();
    const authenticatedRedirectPath = user ? getPostAuthRedirectPath(user.role, returnPath) : null;

    useEffect(() => {
        if (isBootstrapping || !isAuthenticated || !authenticatedRedirectPath) return;
        navigateAfterSignIn(authenticatedRedirectPath);
    }, [authenticatedRedirectPath, isAuthenticated, isBootstrapping, navigateAfterSignIn]);

    return {
        shouldRenderAuthPage: !isBootstrapping && !isAuthenticated,
    };
}
