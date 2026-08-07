'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { DesktopNavRail, MobileTabBar } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

export function AppShell({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user, isBootstrapping } = useAuth();

    useEffect(() => {
        if (isBootstrapping) return;
        if (user?.role === 'ADMIN') {
            router.replace(routes.admin);
        }
    }, [isBootstrapping, router, user?.role]);

    if (isBootstrapping || user?.role === 'ADMIN') {
        return <div className="min-h-screen bg-background" />;
    }

    return (
        <div className="min-h-screen bg-background">
            <DesktopNavRail />
            <main className="w-full min-h-screen pb-20 lg:pb-0 lg:pl-55">
                <div className="lg:max-w-none">{children}</div>
            </main>
            <MobileTabBar />
        </div>
    );
}
