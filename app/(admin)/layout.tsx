'use client';

import { LogOut, Menu, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type MouseEvent, type ReactNode, useState } from 'react';

import { AdminNavigationProvider, type AdminTab, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { RefineAdminProvider } from '@/components/admin/RefineAdminProvider';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

// Sidebar grouping for the admin design system (AGENTS.md): a persistent
// left sidebar grouped by domain, not top-level pill tabs.
const TAB_GROUP: Record<AdminTab, 'overview' | 'catalog' | 'operations'> = {
    metrics: 'overview',
    eventPlans: 'catalog',
    paidServices: 'catalog',
    modules: 'catalog',
    eventTypes: 'catalog',
    assignments: 'operations',
    billingOps: 'operations',
    refunds: 'operations',
    lifecycle: 'operations',
};
const GROUP_ORDER = ['overview', 'catalog', 'operations'] as const;

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

    const initials = (email ?? '?').slice(0, 2).toUpperCase();

    return (
        <aside
            className={cn(
                'flex flex-col gap-5 bg-card px-3 py-4.5',
                mobile ? 'min-h-full' : 'hidden h-full w-64 shrink-0 overflow-y-auto border-r border-border lg:flex'
            )}
        >
            <div className="flex items-center gap-2.5 px-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-primary to-primary-dark text-white">
                    <Shield className="h-[15px] w-[15px]" />
                </div>
                <div className="min-w-0 leading-tight">
                    <p className="truncate text-[14.5px] font-extrabold tracking-tight text-ink">{t('layout.console')}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-faint">{t('eyebrow')}</p>
                </div>
            </div>

            {GROUP_ORDER.map((group) => {
                const groupTabs = tabs.filter(({ key }) => TAB_GROUP[key] === group);
                if (groupTabs.length === 0) return null;
                return (
                    <nav key={group}>
                        <p className="mb-1.5 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                            {t(`layout.group${group.charAt(0).toUpperCase()}${group.slice(1)}` as 'layout.groupOverview')}
                        </p>
                        <div className="space-y-px">
                            {groupTabs.map(({ key, label, icon: Icon }) => {
                                const active = tab === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        data-tab={key}
                                        aria-current={active ? 'page' : undefined}
                                        onClick={handleNavClick}
                                        className={cn(
                                            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.3px] font-semibold transition-colors',
                                            active ? 'bg-primary-light text-primary-dark' : 'text-ink-muted hover:bg-canvas hover:text-ink'
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0 opacity-85" />
                                        <span className="truncate">{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>
                );
            })}

            <div className="mt-auto flex items-center gap-2 border-t border-border px-2.5 pt-3">
                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10.5px] font-extrabold text-ink-muted">
                    {initials}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[12.3px] font-bold text-ink">{email ?? t('layout.console')}</p>
                    {userId && <p className="truncate text-[10.8px] text-ink-faint">{userId}</p>}
                </div>
                <button
                    type="button"
                    onClick={handleLogoutClick}
                    aria-label={t('layout.signOut')}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                >
                    <LogOut className="h-3.5 w-3.5" />
                </button>
            </div>
        </aside>
    );
}

function AdminTopbar() {
    const t = useTranslations('AdminPage');
    const { tab, tabs } = useAdminNavigation();
    const activeLabel = tabs.find((item) => item.key === tab)?.label;

    return (
        <header className="sticky top-0 z-20 hidden items-center gap-2 border-b border-border bg-card/90 px-6 py-2.5 text-[13px] text-ink-faint backdrop-blur lg:flex">
            <span>{t('layout.console')}</span>
            <span aria-hidden="true">›</span>
            <span className="font-bold text-ink">{activeLabel}</span>
        </header>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    const t = useTranslations('AdminPage');
    const router = useRouter();
    const { user, isBootstrapping, logout } = useAuth();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [signOutOpen, setSignOutOpen] = useState(false);

    if (isBootstrapping) {
        return <div className="admin-shell h-full bg-canvas" />;
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
        <RefineAdminProvider>
            <AdminNavigationProvider>
                <div className="admin-shell flex h-full min-h-0 overflow-hidden bg-canvas text-ink">
                    <div className="mx-auto flex h-full min-h-0 w-full">
                        <AdminShellNav email={user?.email} userId={user?.userId} onLogout={handleLogout} />

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
        </RefineAdminProvider>
    );
}
