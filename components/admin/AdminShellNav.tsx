'use client';

import { LogOut, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { type AdminTab, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { cn } from '@/lib/utils';

const TAB_GROUP: Record<AdminTab, 'overview' | 'catalog' | 'operations'> = {
    metrics: 'overview',
    eventPlans: 'catalog',
    planAvailability: 'catalog',
    planModules: 'catalog',
    paidServices: 'catalog',
    modules: 'catalog',
    eventTypes: 'catalog',
    assignments: 'operations',
    billingOps: 'operations',
    refunds: 'operations',
    lifecycle: 'operations',
};
const GROUP_ORDER = ['overview', 'catalog', 'operations'] as const;

export function AdminShellNav({
    email,
    userId,
    onLogoutAction,
    mobile = false,
    onNavigateAction,
}: {
    email?: string | null;
    userId?: string | null;
    onLogoutAction: () => Promise<void>;
    mobile?: boolean;
    onNavigateAction?: () => void;
}) {
    const t = useTranslations('AdminPage');
    const { tab, tabs, setTab } = useAdminNavigation();

    function handleNavClick(event: MouseEvent<HTMLButtonElement>) {
        const nextTab = event.currentTarget.dataset.tab as Parameters<typeof setTab>[0] | undefined;
        if (!nextTab) return;
        setTab(nextTab);
        onNavigateAction?.();
    }

    function handleLogoutClick() {
        void onLogoutAction();
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
