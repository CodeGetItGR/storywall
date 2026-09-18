'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { AccountPanelShell } from '@/components/account/AccountPanelShell';
import { DesktopNavRail, MobileTabBar } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { AccountPanelProvider } from '@/providers/AccountPanelProvider';

export function AppShell({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, isBootstrapping } = useAuth();
    const isAuthenticated = Boolean(user);

    useEffect(() => {
        if (isBootstrapping) return;
        if (!isAuthenticated) {
            const next = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`;
            router.replace(routes.auth.login({ next }));
            return;
        }
        if (user?.role === 'ADMIN') {
            router.replace(routes.admin);
        }
    }, [isAuthenticated, isBootstrapping, pathname, router, searchParams, user?.role]);

    if (isBootstrapping || !isAuthenticated || user?.role === 'ADMIN') {
        return <div className="h-full bg-background" />;
    }

    const shellContent = (
        <div className="desktop-account-shell flex h-full min-h-0 overflow-hidden bg-background">
            <DesktopNavRail />
            <main className="desktop-account-page h-full min-w-0 flex-1 overflow-y-auto overscroll-contain bg-background pb-20 lg:ml-20 lg:pb-0">
                <div className="min-h-full lg:max-w-none">{children}</div>
            </main>
            <MobileTabBar />
        </div>
    );

    return (
        <AccountPanelProvider>
            <AccountPanelShell>{shellContent}</AccountPanelShell>
        </AccountPanelProvider>
    );
}
