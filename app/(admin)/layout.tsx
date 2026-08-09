'use client';

import { LogOut, Menu, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type MouseEvent, type ReactNode, useState } from 'react';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

function AdminShellNav({
    email,
    userId,
    onLogout,
    mobile = false,
    onNavigate,
}: {
    email?: string | null;
    userId?: string | null;
    onLogout: () => Promise<void>;
    mobile?: boolean;
    onNavigate?: () => void;
}) {
    const t = useTranslations('AdminPage');
    const { tab, tabs, setTab } = useAdminNavigation();

    function handleNavClick(event: MouseEvent<HTMLButtonElement>) {
        const nextTab = event.currentTarget.dataset.tab as Parameters<typeof setTab>[0] | undefined;
        if (!nextTab) return;
        setTab(nextTab);
        onNavigate?.();
    }

    function handleLogoutClick() {
        void onLogout();
    }

    return (
        <aside
            className={cn(
                'flex flex-col bg-[#f3eee6] px-5 py-6',
                mobile ? 'min-h-full' : 'hidden h-full w-72 shrink-0 overflow-hidden border-r border-black/5 lg:flex'
            )}
        >
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white shadow-sm">
                    <Shield className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{t('eyebrow')}</p>
                    <p className="text-lg font-semibold">{t('layout.console')}</p>
                </div>
            </div>

            <nav className="mt-8 space-y-1.5">
                {tabs.map(({ key, label, icon: Icon }) => {
                    const active = tab === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            data-tab={key}
                            onClick={handleNavClick}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                                active ? 'bg-ink text-white' : 'bg-white text-ink-muted hover:bg-surface-muted hover:text-ink'
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="mt-auto pt-6 text-xs text-ink-muted">
                <p className="font-semibold uppercase tracking-[0.18em] text-ink-faint">{t('layout.signedInAs')}</p>
                <p className="mt-2 text-sm font-semibold text-ink">{email ?? t('layout.console')}</p>
                {userId && <p className="mt-1 text-xs text-ink-muted">{userId}</p>}
                <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-ink-muted shadow-sm"
                >
                    <LogOut className="h-4 w-4" />
                    {t('layout.signOut')}
                </button>
            </div>
        </aside>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    const t = useTranslations('AdminPage');
    const router = useRouter();
    const { user, isBootstrapping, logout } = useAuth();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);

    if (isBootstrapping) {
        return <div className="h-full bg-[#f7f3ed]" />;
    }

    if (user?.role !== 'ADMIN') {
        return <>{children}</>;
    }

    async function handleLogout() {
        await logout();
        router.push(routes.login);
    }

    function handleCloseMobileNav() {
        setMobileNavOpen(false);
    }

    function handleOpenMobileNav() {
        setMobileNavOpen(true);
    }

    function handleOpenSignOut() {
        setSignOutOpen(true);
    }

    function handleCloseSignOut() {
        setSignOutOpen(false);
    }

    async function handleConfirmSignOut() {
        setSignOutOpen(false);
        await handleLogout();
    }

    return (
        <AdminNavigationProvider>
            <div className="flex h-full min-h-0 overflow-hidden bg-[#f7f3ed] text-ink">
                <div className="mx-auto flex h-full min-h-0 w-full">
                    <AdminShellNav email={user?.email} userId={user?.userId} onLogout={handleLogout} />

                    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                        <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f7f3ed]/90 px-4 py-3 backdrop-blur lg:hidden">
                            <div className="flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={handleOpenMobileNav}
                                    className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-2 text-sm font-semibold text-white shadow-sm"
                                >
                                    <Menu className="h-4 w-4" />
                                    {t('layout.console')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenSignOut}
                                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-ink-muted shadow-sm"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {t('layout.signOut')}
                                </button>
                            </div>
                        </header>

                        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
                    </div>
                </div>

                <Modal open={mobileNavOpen} onClose={handleCloseMobileNav} variant="sheet" size="full" closeLabel={t('layout.closeMenu') ?? 'Close'}>
                    <Modal.Body className="px-4 pb-4 pt-12">
                        <AdminShellNav
                            mobile
                            email={user?.email}
                            userId={user?.userId}
                            onLogout={handleLogout}
                            onNavigate={handleCloseMobileNav}
                        />
                    </Modal.Body>
                </Modal>

                <ConfirmActionModal
                    open={signOutOpen}
                    onClose={handleCloseSignOut}
                    title={t('layout.signOutConfirmTitle')}
                    body={t('layout.signOutConfirmBody')}
                    cancelLabel={t('cancel')}
                    confirmLabel={t('layout.signOut')}
                    isConfirming={false}
                    onConfirm={handleConfirmSignOut}
                    tone="default"
                    icon={<LogOut className="h-5 w-5" aria-hidden="true" />}
                />
            </div>
        </AdminNavigationProvider>
    );
}
