'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

export function useAuthPageRedirect() {
    const router = useRouter();
    const { isAuthenticated, isBootstrapping, user } = useAuth();
    const authenticatedRedirectPath = user?.role === 'ADMIN' ? routes.admin : routes.feed;

    useEffect(() => {
        if (isBootstrapping || !isAuthenticated) return;
        router.replace(authenticatedRedirectPath);
    }, [authenticatedRedirectPath, isAuthenticated, isBootstrapping, router]);

    return {
        shouldRenderAuthPage: !isBootstrapping && !isAuthenticated,
    };
}
