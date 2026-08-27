'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { DesktopNavRail, MobileTabBar } from '@/components/layout';
import { HostOnboardingWizard } from '@/components/onboarding/HostOnboardingWizard';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

export function AppShell({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isBootstrapping } = useAuth();
    const isChromeLessPage = pathname === routes.eventNotFound || pathname === routes.home;
    const isAuthenticated = Boolean(user);

    useEffect(() => {
        if (isBootstrapping) return;
        if (!isAuthenticated && !isChromeLessPage) {
            router.replace(routes.login);
            return;
        }
        if (user?.role === 'ADMIN') {
            router.replace(routes.admin);
        }
    }, [isAuthenticated, isBootstrapping, isChromeLessPage, router, user?.role]);

    if (isBootstrapping || (!isAuthenticated && !isChromeLessPage) || user?.role === 'ADMIN') {
        return <div className="h-full bg-background" />;
    }

    if (isChromeLessPage) {
        return <div className="h-full bg-background">{children}</div>;
    }

    return (
        <div className="flex h-full min-h-0 overflow-hidden bg-background">
            <DesktopNavRail />
            <main className="h-full min-w-0 flex-1 overflow-y-auto pb-20 lg:pb-0 lg:pl-55">
                <div className="min-h-full lg:max-w-none">{children}</div>
            </main>
            <MobileTabBar />
            <HostOnboardingWizard />
        </div>
    );
}
