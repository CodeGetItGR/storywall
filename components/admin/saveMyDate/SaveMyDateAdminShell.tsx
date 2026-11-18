'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';

import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb';
import { AdminFrame, type AdminFrameNavOptions } from '@/components/admin/AdminFrame';
import { SaveMyDateAdminNav } from '@/components/admin/saveMyDate/SaveMyDateAdminNav';
import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { useAdminLayoutShell } from '@/hooks/useAdminLayoutShell';
import { useSaveMyDateAdminNav } from '@/hooks/useSaveMyDateAdminNav';
import { canUseSaveMyDateAdmin } from '@/lib/adminAccess';

// The Save my date admin's frame: its own menu, with the console's sign-in, sign-out and slate look. Admins only.
export function SaveMyDateAdminShell({ children }: { children: ReactNode }) {
    const t = useTranslations('AdminPage');
    const shell = useAdminLayoutShell();
    const { groups, activeLabel } = useSaveMyDateAdminNav();
    const { user, isBootstrapping, handleLogout } = shell;

    function renderNav({ mobile, onNavigate }: AdminFrameNavOptions) {
        return (
            <SaveMyDateAdminNav
                groups={groups}
                mobile={mobile}
                email={user?.email}
                userId={user?.userId}
                onLogoutAction={handleLogout}
                onNavigateAction={onNavigate}
            />
        );
    }

    if (isBootstrapping || !user) {
        return <AuthLoadingState className="admin-shell bg-canvas" />;
    }

    if (!canUseSaveMyDateAdmin(user.role)) {
        return (
            <div className="admin-shell h-full bg-canvas text-ink">
                <AdminAccessDenied title={t('accessDenied.title')} body={t('accessDenied.body')} />
            </div>
        );
    }

    return (
        <AdminFrame
            shell={shell}
            menuLabel={t('saveMyDate.title')}
            topbar={<AdminBreadcrumb root={t('saveMyDate.title')} current={activeLabel} />}
            renderNav={renderNav}
        >
            {children}
        </AdminFrame>
    );
}
