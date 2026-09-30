'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { AccountPanelShell } from '@/components/account/AccountPanelShell';
import { DemoActAsBar } from '@/components/demo/DemoActAsBar';
import { AuthLoadingState, DesktopNavRail, MobileTabBar } from '@/components/layout';
import { useAdminDemoEventAccess } from '@/hooks/useAdminDemoEventAccess';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { AccountPanelProvider } from '@/providers/AccountPanelProvider';

export function AppShell({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, isBootstrapping } = useAuth();
    const isAuthenticated = Boolean(user);
    const adminAccess = useAdminDemoEventAccess(pathname);
    const isBlockedAdmin = user?.role === 'ADMIN' && !adminAccess.isAdminAllowed;

    useEffect(() => {
        if (isBootstrapping) return;
        if (!isAuthenticated) {
            const next = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`;
            router.replace(routes.auth.login({ next }));
            return;
        }
        if (isBlockedAdmin && !adminAccess.isChecking) {
            router.replace(routes.admin);
        }
    }, [adminAccess.isChecking, isAuthenticated, isBlockedAdmin, isBootstrapping, pathname, router, searchParams]);

    if (isBootstrapping || !isAuthenticated || isBlockedAdmin) {
        return <AuthLoadingState />;
    }

    const shellContent = (
        <div className="desktop-account-shell flex h-full min-h-0 overflow-hidden bg-background">
            <DesktopNavRail />
            <main className="desktop-account-page h-full min-w-0 flex-1 overflow-y-auto overscroll-contain bg-background pb-20 lg:ml-20 lg:pb-0">
                {/* Demo authoring (admins on a demo event only) */}
                {adminAccess.isAdminAllowed && adminAccess.eventId && <DemoActAsBar key={adminAccess.eventId} eventId={adminAccess.eventId} />}
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
