'use client';

import { LogOut, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';

import { AdminNavigationProvider } from '@/components/admin/AdminNavigationContext';
import { AdminShellNav } from '@/components/admin/AdminShellNav';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { RefineAdminProvider } from '@/components/admin/RefineAdminProvider';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useAdminLayoutShell } from '@/hooks/useAdminLayoutShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
    const t = useTranslations('AdminPage');
    const {
        user,
        isBootstrapping,
        mobileNavOpen,
        signOutOpen,
        handleLogout,
        handleOpenMobileNav,
        handleCloseMobileNav,
        handleOpenSignOut,
        handleCloseSignOut,
        handleConfirmSignOut,
    } = useAdminLayoutShell();

    if (isBootstrapping || !user) {
        return <div className="admin-shell h-full bg-canvas" />;
    }

    if (user.role !== 'ADMIN') {
        return <>{children}</>;
    }

    return (
        <RefineAdminProvider>
            <AdminNavigationProvider>
                <div className="admin-shell flex h-full min-h-0 overflow-hidden bg-canvas text-ink">
                    <div className="mx-auto flex h-full min-h-0 w-full">
                        <AdminShellNav email={user?.email} userId={user?.userId} onLogoutAction={handleLogout} />

                        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                            <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
                                <button
                                    type="button"
                                    onClick={handleOpenMobileNav}
                                    className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white"
                                >
                                    <Menu className="h-4 w-4" />
                                    {t('layout.console')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenSignOut}
                                    className="inline-flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-sm font-semibold text-ink-muted"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {t('layout.signOut')}
                                </button>
                            </header>

                            <AdminTopbar />

                            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-canvas">{children}</main>
                        </div>
                    </div>

                    <Modal
                        open={mobileNavOpen}
                        onClose={handleCloseMobileNav}
                        variant="sheet"
                        size="full"
                        closeLabel={t('layout.closeMenu') ?? 'Close'}
                    >
                        <Modal.Body className="px-4 pb-4 pt-12">
                            <AdminShellNav
                                mobile
                                email={user?.email}
                                userId={user?.userId}
                                onLogoutAction={handleLogout}
                                onNavigateAction={handleCloseMobileNav}
                            />
                        </Modal.Body>
                    </Modal>

                    <ConfirmActionModal
                        open={signOutOpen}
                        onCloseAction={handleCloseSignOut}
                        title={t('layout.signOutConfirmTitle')}
                        body={t('layout.signOutConfirmBody')}
                        cancelLabel={t('cancel')}
                        confirmLabel={t('layout.signOut')}
                        isConfirming={false}
                        onConfirmAction={handleConfirmSignOut}
                        tone="default"
                        icon={<LogOut className="h-5 w-5" aria-hidden="true" />}
                    />
                </div>
            </AdminNavigationProvider>
        </RefineAdminProvider>
    );
}
