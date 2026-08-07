'use client';

import { CalendarDays, Layers3, LifeBuoy, Receipt, Shield, Undo2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useEffect, useState } from 'react';

import { BillingOpsPanel } from '@/components/admin/BillingOpsPanel';
import { EventLifecyclePanel } from '@/components/admin/EventLifecyclePanel';
import { ModuleRegistryPanel } from '@/components/admin/ModuleRegistryPanel';
import { PlanAssignmentPanel } from '@/components/admin/PlanAssignmentPanel';
import { PlanCatalogPanel } from '@/components/admin/PlanCatalogPanel';
import { RefundQueuePanel } from '@/components/admin/RefundQueuePanel';
import { cn } from '@/lib/utils';

type AdminTab = 'accountPlans' | 'eventPlans' | 'modules' | 'assignments' | 'billingOps' | 'refunds' | 'lifecycle';

const HASH_TO_TAB: Record<string, AdminTab> = {
    '#account-plans': 'accountPlans',
    '#event-plans': 'eventPlans',
    '#modules': 'modules',
    '#assignments': 'assignments',
    '#billing-ops': 'billingOps',
    '#refunds': 'refunds',
    '#lifecycle': 'lifecycle',
};

const TAB_TO_HASH: Record<AdminTab, string> = {
    accountPlans: '#account-plans',
    eventPlans: '#event-plans',
    modules: '#modules',
    assignments: '#assignments',
    billingOps: '#billing-ops',
    refunds: '#refunds',
    lifecycle: '#lifecycle',
};

function currentHashTab(): AdminTab {
    if (typeof window === 'undefined') return 'accountPlans';
    return HASH_TO_TAB[window.location.hash] ?? 'accountPlans';
}

export function AdminConsole() {
    const t = useTranslations('AdminPage');
    const [tab, setTab] = useState<AdminTab>(currentHashTab);
    const tabs = [
        { key: 'accountPlans' as const, label: t('tabs.accountPlans'), icon: Users },
        { key: 'eventPlans' as const, label: t('tabs.eventPlans'), icon: CalendarDays },
        { key: 'modules' as const, label: t('tabs.modules'), icon: Shield },
        { key: 'assignments' as const, label: t('tabs.assignments'), icon: Layers3 },
        { key: 'billingOps' as const, label: t('tabs.billingOps'), icon: Receipt },
        { key: 'refunds' as const, label: t('tabs.refunds'), icon: Undo2 },
        { key: 'lifecycle' as const, label: t('tabs.lifecycle'), icon: LifeBuoy },
    ];

    useEffect(() => {
        function handleHashChange() {
            setTab(currentHashTab());
        }

        if (!window.location.hash) {
            window.history.replaceState(null, '', TAB_TO_HASH.accountPlans);
        }

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    function handleTabClick(event: MouseEvent<HTMLButtonElement>) {
        const nextTab = event.currentTarget.dataset.tab as AdminTab | undefined;
        if (!nextTab) return;
        setTab(nextTab);
        window.history.replaceState(null, '', TAB_TO_HASH[nextTab]);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }

    return (
        <div className="mx-auto max-w-7xl px-3 pb-16 pt-4 sm:px-4 lg:px-6 lg:pb-8">
            <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-dark">{t('eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{t('title')}</h1>
                    <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t('subtitle')}</p>
                </div>
            </header>

            <div className="sticky top-0 z-10 -mx-3 mb-4 flex gap-2 overflow-x-auto border-b border-border bg-[#f7f3ed]/95 px-3 pb-3 pt-2 backdrop-blur sm:mx-0 sm:px-0">
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        data-tab={key}
                        onClick={handleTabClick}
                        className={cn(
                            'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4',
                            tab === key ? 'bg-ink text-white shadow-sm' : 'bg-card text-ink-muted hover:bg-surface-muted hover:text-ink'
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'accountPlans' && <PlanCatalogPanel scope="ACCOUNT" />}
            {tab === 'eventPlans' && <PlanCatalogPanel scope="EVENT" />}
            {tab === 'modules' && <ModuleRegistryPanel />}
            {tab === 'assignments' && <PlanAssignmentPanel />}
            {tab === 'billingOps' && <BillingOpsPanel />}
            {tab === 'refunds' && <RefundQueuePanel />}
            {tab === 'lifecycle' && <EventLifecyclePanel />}
        </div>
    );
}
