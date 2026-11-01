'use client';

import { LogOut, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import { type AdminTab, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { usePendingOutreachRequestsCount } from '@/hooks/useAdminOutreachRequests';
import { usePendingApplicationsCount } from '@/hooks/useAdminPartnerApplications';
import { useNewVendorMessagesCount } from '@/hooks/useAdminVendorMessages';
import { canOpenAdminTab } from '@/lib/adminAccess';
import { cn } from '@/lib/utils';

const TAB_GROUP: Record<AdminTab, 'overview' | 'catalog' | 'marketing' | 'operations'> = {
    metrics: 'overview',
    funnel: 'overview',
    visitors: 'overview',
    moduleUsage: 'overview',
    costTracking: 'overview',
    plans: 'catalog',
    paidServices: 'catalog',
    outreach: 'marketing',
    outreachRequests: 'marketing',
    discountCodes: 'marketing',
    guestOffer: 'marketing',
    appReviews: 'marketing',
    campaignOverview: 'marketing',
    campaigns: 'marketing',
    partnerApplications: 'operations',
    collaborations: 'operations',
    partnerCards: 'operations',
    reactionTypes: 'catalog',
    themePresets: 'catalog',
    themeFonts: 'catalog',
    qrCards: 'catalog',
    demoEvents: 'catalog',
    billingOps: 'operations',
    siteNotices: 'operations',
    phones: 'operations',
    orders: 'operations',
    withdrawals: 'operations',
    accounts: 'operations',
    events: 'operations',
    reports: 'operations',
    bugReports: 'operations',
    vendorMessages: 'operations',
    errorEvents: 'operations',
    auditLog: 'operations',
};
const GROUP_ORDER = ['overview', 'catalog', 'marketing', 'operations'] as const;

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
    const { role, tab, tabs, setTab } = useAdminNavigation();
    // Only admins see Partner applications; the count would 403 for anyone else.
    const pendingApplications = usePendingApplicationsCount(canOpenAdminTab(role, 'partnerApplications'));
    const pendingRequests = usePendingOutreachRequestsCount(canOpenAdminTab(role, 'outreachRequests'));
    const newVendorMessages = useNewVendorMessagesCount(canOpenAdminTab(role, 'vendorMessages'));
    const pendingCounts: Partial<Record<AdminTab, number>> = {
        partnerApplications: pendingApplications,
        outreachRequests: pendingRequests,
        vendorMessages: newVendorMessages,
    };

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
                mobile ? 'min-h-full' : 'hidden h-full w-64 shrink-0 overflow-y-auto border-r border-border lg:flex',
            )}
        >
            <div className="flex items-center gap-2.5 px-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-primary to-primary-dark text-white">
                    <Shield className="h-[15px] w-[15px]" />
                </div>
                <div className="min-w-0 leading-tight">
                    <p className="truncate text-[14.5px] font-extrabold tracking-tight text-ink">{t('layout.console')}</p>
                    <p className="text-[10px] font-semibold tracking-[0.06em] text-ink-faint uppercase">
                        {role === 'MARKETING' ? t('eyebrowMarketing') : t('eyebrow')}
                    </p>
                </div>
            </div>

            {GROUP_ORDER.map((group) => {
                const groupTabs = tabs.filter(({ key }) => TAB_GROUP[key] === group);
                if (groupTabs.length === 0) return null;
                return (
                    <nav key={group}>
                        <p className="mb-1.5 px-2.5 text-[10.5px] font-bold tracking-[0.08em] text-ink-faint uppercase">
                            {t(`layout.group${group.charAt(0).toUpperCase()}${group.slice(1)}` as 'layout.groupOverview')}
                        </p>
                        <div className="space-y-px">
                            {groupTabs.map(({ key, label, icon: Icon }) => {
                                const active = tab === key;
                                const pendingCount = pendingCounts[key] ?? 0;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        data-tab={key}
                                        aria-current={active ? 'page' : undefined}
                                        onClick={handleNavClick}
                                        className={cn(
                                            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.3px] font-semibold transition-colors',
                                            active ? 'bg-primary-light text-primary-dark' : 'text-ink-muted hover:bg-canvas hover:text-ink',
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0 opacity-85" />
                                        <span className="truncate">{label}</span>
                                        {/* Pending applications, outreach requests and new vendor messages */}
                                        {pendingCount > 0 && (
                                            <span className="ml-auto rounded-full bg-status-warn-wash px-1.5 font-mono text-[11px] font-bold text-status-warn tabular-nums">
                                                <span aria-hidden="true">{pendingCount}</span>
                                                <span className="sr-only">{t('layout.pendingCount', { count: pendingCount })}</span>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>
                );
            })}

            <div className="mt-auto flex flex-col gap-3 border-t border-border pt-3">
                <div className="px-2.5">
                    <LanguageSwitcher />
                </div>

                <div className="flex items-center gap-2 px-2.5">
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
            </div>
        </aside>
    );
}
