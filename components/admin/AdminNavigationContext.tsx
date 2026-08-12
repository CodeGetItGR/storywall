'use client';

import { BarChart3, CalendarDays, Layers3, LifeBuoy, type LucideIcon, Receipt, Shield, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AdminTab = 'metrics' | 'eventPlans' | 'modules' | 'assignments' | 'billingOps' | 'refunds' | 'lifecycle';

export type AdminTabItem = {
    key: AdminTab;
    label: string;
    icon: LucideIcon;
};

const HASH_TO_TAB: Record<string, AdminTab> = {
    '#metrics': 'metrics',
    '#event-plans': 'eventPlans',
    '#modules': 'modules',
    '#assignments': 'assignments',
    '#billing-ops': 'billingOps',
    '#refunds': 'refunds',
    '#lifecycle': 'lifecycle',
};

const TAB_TO_HASH: Record<AdminTab, string> = {
    metrics: '#metrics',
    eventPlans: '#event-plans',
    modules: '#modules',
    assignments: '#assignments',
    billingOps: '#billing-ops',
    refunds: '#refunds',
    lifecycle: '#lifecycle',
};

const AdminNavigationContext = createContext<
    | {
          tabs: AdminTabItem[];
          tab: AdminTab;
          activeHash: string;
          setTab: (nextTab: AdminTab) => void;
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
        setTabState(nextTab);
        window.history.replaceState(null, '', TAB_TO_HASH[nextTab]);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, []);

    const tabs = useMemo<AdminTabItem[]>(
        () => [
            { key: 'metrics', label: t('metrics'), icon: BarChart3 },
            { key: 'eventPlans', label: t('eventPlans'), icon: CalendarDays },
            { key: 'modules', label: t('modules'), icon: Shield },
            { key: 'assignments', label: t('assignments'), icon: Layers3 },
            { key: 'billingOps', label: t('billingOps'), icon: Receipt },
            { key: 'refunds', label: t('refunds'), icon: Undo2 },
            { key: 'lifecycle', label: t('lifecycle'), icon: LifeBuoy },
        ],
        [t]
    );

    const value = useMemo(
        () => ({
            tabs,
            tab,
            activeHash: TAB_TO_HASH[tab],
            setTab,
        }),
        [setTab, tab, tabs]
    );

    return <AdminNavigationContext.Provider value={value}>{children}</AdminNavigationContext.Provider>;
}

export function useAdminNavigation() {
    const value = useContext(AdminNavigationContext);
    if (!value) throw new Error('useAdminNavigation must be used within AdminNavigationProvider');
    return value;
}
