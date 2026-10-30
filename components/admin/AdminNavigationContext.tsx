'use client';

import {
    BarChart3,
    Bug,
    CalendarDays,
    ChartLine,
    ChartNoAxesCombined,
    Flag,
    Footprints,
    GalleryVerticalEnd,
    Handshake,
    Inbox,
    LayoutGrid,
    Link2,
    ListChecks,
    type LucideIcon,
    Megaphone,
    MonitorPlay,
    OctagonAlert,
    PackagePlus,
    Palette,
    PartyPopper,
    QrCode,
    Receipt,
    Send,
    ShoppingBag,
    Smartphone,
    Smile,
    Star,
    TicketPercent,
    TrendingUp,
    Type,
    Undo2,
    Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { adminHomeTab, canOpenAdminTab, resolveAdminTab } from '@/lib/adminAccess';
import { COLLABORATIONS_HASH_ROOT, isCollaborationsHash } from '@/lib/adminCollaborationsRouting';
import { DEMO_EVENTS_HASH_ROOT, isDemoEventsHash } from '@/lib/adminDemoEventsRouting';
import { EVENTS_HASH_ROOT, isEventsHash } from '@/lib/adminEvents';
import { isOrdersHash, ORDERS_HASH_ROOT } from '@/lib/adminOrders';
import { isOutreachHash, OUTREACH_HASH_ROOT } from '@/lib/adminOutreachRouting';
import { isPartnerApplicationsHash, PARTNER_APPLICATIONS_HASH_ROOT } from '@/lib/adminPartnerApplicationsRouting';
import { isPlansHash, PLANS_HASH_ROOT } from '@/lib/adminPlansRouting';
import { isWithdrawalsHash, WITHDRAWALS_HASH_ROOT } from '@/lib/adminWithdrawalsRouting';
import type { PlatformRole } from '@/lib/api/types';
import { pushPageEntry, replacePageUrl } from '@/lib/overlayHistory';

export type AdminTab =
    | 'metrics'
    | 'funnel'
    | 'visitors'
    | 'moduleUsage'
    | 'costTracking'
    | 'plans'
    | 'paidServices'
    | 'outreach'
    | 'outreachRequests'
    | 'discountCodes'
    | 'partnerApplications'
    | 'collaborations'
    | 'partnerCards'
    | 'reactionTypes'
    | 'themePresets'
    | 'themeFonts'
    | 'qrCards'
    | 'demoEvents'
    | 'billingOps'
    | 'events'
    | 'orders'
    | 'withdrawals'
    | 'accounts'
    | 'reports'
    | 'bugReports'
    | 'errorEvents'
    | 'appReviews'
    | 'campaignOverview'
    | 'campaigns'
    | 'siteNotices'
    | 'phones';

export type AdminTabItem = {
    key: AdminTab;
    label: string;
    icon: LucideIcon;
};

// Carrying an id a panel already shows — and the title, when a row knows one —
// into the panel that acts on it keeps assignment and add-on removal usable
// without retyping it.
export type AdminFocus = {
    eventId?: string;
    eventTitle?: string;
    orderId?: string;
    // An account's orders: the Orders list opens filtered to this buyer.
    buyerId?: string;
    buyerLabel?: string;
    // An account's events: the Events list opens filtered to this host.
    hostUserId?: string;
    hostLabel?: string;
    // A 500's reference, carried from a bug report into the Errors list.
    errorRef?: string;
};

const HASH_TO_TAB: Record<string, AdminTab> = {
    '#metrics': 'metrics',
    '#funnel': 'funnel',
    '#visitors': 'visitors',
    '#module-usage': 'moduleUsage',
    '#cost-tracking': 'costTracking',
    '#paid-services': 'paidServices',
    '#outreach-requests': 'outreachRequests',
    '#discount-codes': 'discountCodes',
    '#partner-cards': 'partnerCards',
    '#reaction-types': 'reactionTypes',
    '#theme-presets': 'themePresets',
    '#theme-fonts': 'themeFonts',
    '#qr-cards': 'qrCards',
    '#billing-ops': 'billingOps',
    '#accounts': 'accounts',
    '#reports': 'reports',
    '#bug-reports': 'bugReports',
    '#errors': 'errorEvents',
    '#reviews': 'appReviews',
    '#campaign-overview': 'campaignOverview',
    '#campaigns': 'campaigns',
    '#site-notices': 'siteNotices',
    '#phones': 'phones',
};

const TAB_TO_HASH: Record<AdminTab, string> = {
    metrics: '#metrics',
    funnel: '#funnel',
    visitors: '#visitors',
    moduleUsage: '#module-usage',
    costTracking: '#cost-tracking',
    plans: PLANS_HASH_ROOT,
    paidServices: '#paid-services',
    outreach: OUTREACH_HASH_ROOT,
    outreachRequests: '#outreach-requests',
    discountCodes: '#discount-codes',
    partnerApplications: PARTNER_APPLICATIONS_HASH_ROOT,
    collaborations: COLLABORATIONS_HASH_ROOT,
    partnerCards: '#partner-cards',
    reactionTypes: '#reaction-types',
    themePresets: '#theme-presets',
    themeFonts: '#theme-fonts',
    qrCards: '#qr-cards',
    demoEvents: DEMO_EVENTS_HASH_ROOT,
    billingOps: '#billing-ops',
    events: EVENTS_HASH_ROOT,
    orders: ORDERS_HASH_ROOT,
    withdrawals: WITHDRAWALS_HASH_ROOT,
    accounts: '#accounts',
    campaignOverview: '#campaign-overview',
    campaigns: '#campaigns',
    reports: '#reports',
    bugReports: '#bug-reports',
    errorEvents: '#errors',
    appReviews: '#reviews',
    siteNotices: '#site-notices',
    phones: '#phones',
};

const AdminNavigationContext = createContext<
    | {
          role: PlatformRole;
          tabs: AdminTabItem[];
          tab: AdminTab;
          activeHash: string;
          focus: AdminFocus | null;
          setTab: (nextTab: AdminTab) => void;
          sendTo: (nextTab: AdminTab, focus: AdminFocus) => void;
      }
    | undefined
>(undefined);

// `#plans/...`, `#collaborations/...`, `#withdrawals/...`, `#events/...` and `#orders/...` carry their own sub-route, parsed by
// the section itself; legacy `#event-plans`, `#modules`, `#event-types` land
// on Plans too so old links keep working.
function hashTab(): AdminTab | null {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    if (isPlansHash(hash)) return 'plans';
    if (isPartnerApplicationsHash(hash)) return 'partnerApplications';
    if (isOutreachHash(hash)) return 'outreach';
    if (isCollaborationsHash(hash)) return 'collaborations';
    if (isDemoEventsHash(hash)) return 'demoEvents';
    if (isWithdrawalsHash(hash)) return 'withdrawals';
    if (isOrdersHash(hash)) return 'orders';
    if (isEventsHash(hash)) return 'events';
    return HASH_TO_TAB[hash] ?? null;
}

// A section the role can't open (or no section at all) lands on the role's home.
function currentHashTab(role: PlatformRole): AdminTab {
    return resolveAdminTab(role, hashTab() ?? adminHomeTab(role));
}

// Each section is its own Back step. Re-selecting the section already shown
// adds no entry, so Back never lands on the same view twice.
function navigateToHash(hash: string) {
    if (window.location.hash !== hash) pushPageEntry(hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
}

// `role` decides which sections exist: MARKETING sees the marketing group and Phones.
export function AdminNavigationProvider({ children, role = 'ADMIN' }: { children: ReactNode; role?: PlatformRole }) {
    const t = useTranslations('AdminPage.tabs');
    const [tab, setTabState] = useState<AdminTab>(() => currentHashTab(role));
    const [focus, setFocus] = useState<AdminFocus | null>(null);

    useEffect(() => {
        function syncFromHash() {
            const shown = hashTab();
            const next = currentHashTab(role);
            // A hidden section's link is rewritten, so Back doesn't return to it.
            if (shown !== next) replacePageUrl(TAB_TO_HASH[next]);
            setTabState(next);
        }

        syncFromHash();

        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, [role]);

    const setTab = useCallback(
        (nextTab: AdminTab) => {
            const target = resolveAdminTab(role, nextTab);
            setFocus(null);
            setTabState(target);
            navigateToHash(TAB_TO_HASH[target]);
        },
        [role],
    );

    // A new object on every call on purpose: handing the same event over twice
    // has to re-prefill the destination form, not be swallowed as "unchanged".
    const sendTo = useCallback(
        (nextTab: AdminTab, nextFocus: AdminFocus) => {
            if (!canOpenAdminTab(role, nextTab)) return;
            setTabState(nextTab);
            setFocus({ ...nextFocus });
            navigateToHash(TAB_TO_HASH[nextTab]);
        },
        [role],
    );

    const allTabs = useMemo<AdminTabItem[]>(
        () => [
            { key: 'metrics', label: t('metrics'), icon: BarChart3 },
            { key: 'funnel', label: t('funnel'), icon: TrendingUp },
            { key: 'visitors', label: t('visitors'), icon: Footprints },
            { key: 'moduleUsage', label: t('moduleUsage'), icon: LayoutGrid },
            { key: 'costTracking', label: t('costTracking'), icon: ChartNoAxesCombined },
            { key: 'plans', label: t('plans'), icon: CalendarDays },
            { key: 'paidServices', label: t('paidServices'), icon: PackagePlus },
            { key: 'outreach', label: t('outreach'), icon: Send },
            { key: 'outreachRequests', label: t('outreachRequests'), icon: ListChecks },
            { key: 'discountCodes', label: t('discountCodes'), icon: TicketPercent },
            { key: 'appReviews', label: t('appReviews'), icon: Star },
            { key: 'campaignOverview', label: t('campaignOverview'), icon: ChartLine },
            { key: 'campaigns', label: t('campaigns'), icon: Link2 },
            { key: 'partnerApplications', label: t('partnerApplications'), icon: Inbox },
            { key: 'collaborations', label: t('collaborations'), icon: Handshake },
            { key: 'partnerCards', label: t('partnerCards'), icon: GalleryVerticalEnd },
            { key: 'reactionTypes', label: t('reactionTypes'), icon: Smile },
            { key: 'themePresets', label: t('themePresets'), icon: Palette },
            { key: 'themeFonts', label: t('themeFonts'), icon: Type },
            { key: 'qrCards', label: t('qrCards'), icon: QrCode },
            { key: 'demoEvents', label: t('demoEvents'), icon: MonitorPlay },
            { key: 'accounts', label: t('accounts'), icon: Users },
            { key: 'events', label: t('events'), icon: PartyPopper },
            { key: 'orders', label: t('orders'), icon: ShoppingBag },
            { key: 'billingOps', label: t('billingOps'), icon: Receipt },
            { key: 'siteNotices', label: t('siteNotices'), icon: Megaphone },
            { key: 'withdrawals', label: t('withdrawals'), icon: Undo2 },
            { key: 'reports', label: t('reports'), icon: Flag },
            { key: 'bugReports', label: t('bugReports'), icon: Bug },
            { key: 'errorEvents', label: t('errorEvents'), icon: OctagonAlert },
            { key: 'phones', label: t('phones'), icon: Smartphone },
        ],
        [t],
    );

    const tabs = useMemo(() => allTabs.filter((item) => canOpenAdminTab(role, item.key)), [allTabs, role]);

    const value = useMemo(
        () => ({
            role,
            tabs,
            tab,
            activeHash: TAB_TO_HASH[tab],
            focus,
            setTab,
            sendTo,
        }),
        [focus, role, sendTo, setTab, tab, tabs],
    );

    return <AdminNavigationContext.Provider value={value}>{children}</AdminNavigationContext.Provider>;
}

export function useAdminNavigation() {
    const value = useContext(AdminNavigationContext);
    if (!value) throw new Error('useAdminNavigation must be used within AdminNavigationProvider');
    return value;
}
