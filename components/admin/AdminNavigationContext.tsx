'use client';

import { BarChart3, Boxes, CalendarDays, Grid3X3, Layers3, type LucideIcon, PackagePlus, Receipt, Shield, Smile, Tag, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AdminTab =
    | 'metrics'
    | 'eventPlans'
    | 'planAvailability'
    | 'planModules'
    | 'paidServices'
    | 'modules'
    | 'eventTypes'
    | 'reactionTypes'
    | 'assignments'
    | 'billingOps'
    | 'refunds';

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
    '#event-plans': 'eventPlans',
    '#plan-availability': 'planAvailability',
    '#plan-modules': 'planModules',
    '#paid-services': 'paidServices',
    '#modules': 'modules',
    '#event-types': 'eventTypes',
    '#reaction-types': 'reactionTypes',
    '#assignments': 'assignments',
    '#billing-ops': 'billingOps',
    '#refunds': 'refunds',
};

const TAB_TO_HASH: Record<AdminTab, string> = {
    metrics: '#metrics',
    eventPlans: '#event-plans',
    planAvailability: '#plan-availability',
    planModules: '#plan-modules',
    paidServices: '#paid-services',
    modules: '#modules',
    eventTypes: '#event-types',
    reactionTypes: '#reaction-types',
    assignments: '#assignments',
    billingOps: '#billing-ops',
    refunds: '#refunds',
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

function currentHashTab(): AdminTab {
    if (typeof window === 'undefined') return 'metrics';
    return HASH_TO_TAB[window.location.hash] ?? 'metrics';
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
            { key: 'eventPlans', label: t('eventPlans'), icon: CalendarDays },
            { key: 'planAvailability', label: t('planAvailability'), icon: Grid3X3 },
            { key: 'planModules', label: t('planModules'), icon: Boxes },
            { key: 'paidServices', label: t('paidServices'), icon: PackagePlus },
            { key: 'modules', label: t('modules'), icon: Shield },
            { key: 'eventTypes', label: t('eventTypes'), icon: Tag },
            { key: 'reactionTypes', label: t('reactionTypes'), icon: Smile },
            { key: 'assignments', label: t('assignments'), icon: Layers3 },
            { key: 'billingOps', label: t('billingOps'), icon: Receipt },
            { key: 'refunds', label: t('refunds'), icon: Undo2 },
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
