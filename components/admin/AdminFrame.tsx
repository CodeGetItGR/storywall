'use client';

import { LogOut, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { PortalScopeProvider } from '@/components/ui/PortalScope';
import type { AdminLayoutShell } from '@/hooks/useAdminLayoutShell';

export type AdminFrameNavOptions = { mobile: boolean; onNavigate?: () => void };

type AdminFrameProps = {
    shell: AdminLayoutShell;
    // The mobile menu button's label: the page's name.
    menuLabel: string;
    // The sidebar, on desktop and inside the mobile menu sheet.
    renderNav: (options: AdminFrameNavOptions) => ReactNode;
    topbar: ReactNode;
    children: ReactNode;
};

// An admin page's frame: sidebar, top bar, mobile menu and sign-out, in the console's slate scope.
export function AdminFrame({ shell, menuLabel, renderNav, topbar, children }: AdminFrameProps) {
    const t = useTranslations('AdminPage');
    const { mobileNavOpen, signOutOpen, handleOpenMobileNav, handleCloseMobileNav, handleOpenSignOut, handleCloseSignOut, handleConfirmSignOut } =
        shell;

    return (
        // Shared modals portal out of .admin-shell; this hands them its slate tokens back.
        <PortalScopeProvider className="admin-shell">
            <div className="admin-shell flex h-full min-h-0 overflow-hidden bg-canvas text-ink">
                <div className="mx-auto flex h-full min-h-0 w-full">
                    {/* Sidebar */}
                    {renderNav({ mobile: false })}

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                        {/* Mobile header */}
                        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
                            <button
                                type="button"
                                onClick={handleOpenMobileNav}
                                className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white"
                            >
                                <Menu className="h-4 w-4" />
                                {menuLabel}
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

                        {/* Top bar */}
                        {topbar}

                        {/* Content */}
                        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-canvas">{children}</main>
                    </div>
                </div>

                {/* Mobile menu */}
                <Modal open={mobileNavOpen} onClose={handleCloseMobileNav} variant="sheet" size="full" closeLabel={t('layout.closeMenu') ?? 'Close'}>
                    <Modal.Body className="px-4 pt-12 pb-4">{renderNav({ mobile: true, onNavigate: handleCloseMobileNav })}</Modal.Body>
                </Modal>

                {/* Sign-out confirmation */}
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
        </PortalScopeProvider>
    );
}
