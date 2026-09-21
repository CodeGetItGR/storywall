'use client';

import {
    BarChart3,
    CalendarDays,
    ChartNoAxesCombined,
    Handshake,
    Layers3,
    type LucideIcon,
    PackagePlus,
    Receipt,
    Smile,
    TicketPercent,
    Undo2,
    Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { isPlansHash, PLANS_HASH_ROOT } from '@/lib/adminPlansRouting';

export type AdminTab =
    | 'metrics'
    | 'costTracking'
    | 'plans'
    | 'paidServices'
    | 'discountCodes'
    | 'collaborations'
    | 'reactionTypes'
    | 'assignments'
    | 'billingOps'
    | 'withdrawals'
    | 'accounts';

export type AdminTabItem = {
    key: AdminTab;
    label: string;
    icon: LucideIcon;
};

// The console has no event or order search: the only ids an admin can reach are
// the ones a panel already shows them. Carrying that id — and the title, when a
// row knows one — into the panel that acts on it keeps assignment and add-on
// removal usable without database access.
export type AdminFocus = {
    eventId?: string;
    eventTitle?: string;
    orderId?: string;
};

const HASH_TO_TAB: Record<string, AdminTab> = {
    '#metrics': 'metrics',
    '#cost-tracking': 'costTracking',
    '#paid-services': 'paidServices',
    '#discount-codes': 'discountCodes',
    '#collaborations': 'collaborations',
    '#reaction-types': 'reactionTypes',
    '#assignments': 'assignments',
    '#billing-ops': 'billingOps',
    '#withdrawals': 'withdrawals',
    '#accounts': 'accounts',
};

const TAB_TO_HASH: Record<AdminTab, string> = {
    metrics: '#metrics',
    costTracking: '#cost-tracking',
    plans: PLANS_HASH_ROOT,
    paidServices: '#paid-services',
    discountCodes: '#discount-codes',
    collaborations: '#collaborations',
    reactionTypes: '#reaction-types',
    assignments: '#assignments',
    billingOps: '#billing-ops',
    withdrawals: '#withdrawals',
    accounts: '#accounts',
};

const AdminNavigationContext = createContext<
    | {
          tabs: AdminTabItem[];
          tab: AdminTab;
          activeHash: string;
          focus: AdminFocus | null;
          setTab: (nextTab: AdminTab) => void;
          sendTo: (nextTab: AdminTab, focus: AdminFocus) => void;
      }
    | undefined
>(undefined);

// `#plans/...` carries its own sub-route (event type or settings view), parsed
// by the Plans section itself; legacy `#event-plans`, `#modules`, `#event-types`
// land there too so old links keep working.
function currentHashTab(): AdminTab {
    if (typeof window === 'undefined') return 'metrics';
    const hash = window.location.hash;
    if (isPlansHash(hash)) return 'plans';
    return HASH_TO_TAB[hash] ?? 'metrics';
}

export function AdminNavigationProvider({ children }: { children: ReactNode }) {
    const t = useTranslations('AdminPage.tabs');
    const [tab, setTabState] = useState<AdminTab>(currentHashTab);
    const [focus, setFocus] = useState<AdminFocus | null>(null);

    useEffect(() => {
        function syncFromHash() {
            setTabState(currentHashTab());
        }

        if (!window.location.hash) {
            window.history.replaceState(null, '', TAB_TO_HASH.metrics);
        }

        syncFromHash();

        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    const setTab = useCallback((nextTab: AdminTab) => {
        setFocus(null);
        setTabState(nextTab);
        window.history.replaceState(null, '', TAB_TO_HASH[nextTab]);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, []);

    // A new object on every call on purpose: handing the same event over twice
    // has to re-prefill the destination form, not be swallowed as "unchanged".
    const sendTo = useCallback((nextTab: AdminTab, nextFocus: AdminFocus) => {
        setTabState(nextTab);
        setFocus({ ...nextFocus });
        window.history.replaceState(null, '', TAB_TO_HASH[nextTab]);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, []);

    const tabs = useMemo<AdminTabItem[]>(
        () => [
            { key: 'metrics', label: t('metrics'), icon: BarChart3 },
            { key: 'costTracking', label: t('costTracking'), icon: ChartNoAxesCombined },
            { key: 'plans', label: t('plans'), icon: CalendarDays },
            { key: 'paidServices', label: t('paidServices'), icon: PackagePlus },
            { key: 'discountCodes', label: t('discountCodes'), icon: TicketPercent },
            { key: 'collaborations', label: t('collaborations'), icon: Handshake },
            { key: 'reactionTypes', label: t('reactionTypes'), icon: Smile },
            { key: 'accounts', label: t('accounts'), icon: Users },
            { key: 'assignments', label: t('assignments'), icon: Layers3 },
            { key: 'billingOps', label: t('billingOps'), icon: Receipt },
            { key: 'withdrawals', label: t('withdrawals'), icon: Undo2 },
        ],
        [t]
    );

    const value = useMemo(
        () => ({
            tabs,
            tab,
            activeHash: TAB_TO_HASH[tab],
            focus,
            setTab,
            sendTo,
        }),
        [focus, sendTo, setTab, tab, tabs]
    );

    return <AdminNavigationContext.Provider value={value}>{children}</AdminNavigationContext.Provider>;
}

export function useAdminNavigation() {
    const value = useContext(AdminNavigationContext);
    if (!value) throw new Error('useAdminNavigation must be used within AdminNavigationProvider');
    return value;
}
