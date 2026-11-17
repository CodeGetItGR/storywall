'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';

import { AdminFrame, type AdminFrameNavOptions } from '@/components/admin/AdminFrame';
import { AdminNavigationProvider } from '@/components/admin/AdminNavigationContext';
import { AdminShellNav } from '@/components/admin/AdminShellNav';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { RefineAdminProvider } from '@/components/admin/RefineAdminProvider';
import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { useAdminLayoutShell } from '@/hooks/useAdminLayoutShell';
import { canUseAdminConsole } from '@/lib/adminAccess';

// The admin console's frame: sidebar, mobile menu and sign-out. Admins and marketing only; anyone else sees the page as is.
export function AdminLayoutShell({ children }: { children: ReactNode }) {
    const t = useTranslations('AdminPage');
    const shell = useAdminLayoutShell();
    const { user, isBootstrapping, handleLogout } = shell;

    function renderNav({ mobile, onNavigate }: AdminFrameNavOptions) {
        return (
            <AdminShellNav mobile={mobile} email={user?.email} userId={user?.userId} onLogoutAction={handleLogout} onNavigateAction={onNavigate} />
        );
    }

    if (isBootstrapping || !user) {
        return <AuthLoadingState className="admin-shell bg-canvas" />;
    }

    if (!canUseAdminConsole(user.role)) {
        return <>{children}</>;
    }

    return (
        <RefineAdminProvider>
            <AdminNavigationProvider role={user.role}>
                <AdminFrame shell={shell} menuLabel={t('layout.console')} topbar={<AdminTopbar />} renderNav={renderNav}>
                    {children}
                </AdminFrame>
            </AdminNavigationProvider>
        </RefineAdminProvider>
    );
}
