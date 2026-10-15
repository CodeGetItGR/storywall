'use client';

import { LandingProfileBadge } from '@/components/landing/LandingProfileBadge';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

export function OccasionAccountLink({ signInLabel }: { signInLabel: string }) {
    const { isAuthenticated, isBootstrapping } = useAuth();

    if (isAuthenticated && !isBootstrapping) return <LandingProfileBadge />;

    return (
        <a className="inline-flex min-h-11 items-center" href={routes.login}>
            {signInLabel}
        </a>
    );
}
