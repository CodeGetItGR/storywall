'use client';

import { CheckCircle2, Receipt, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { type AdminTab, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { PlatformQueueCallout } from '@/components/admin/PlatformQueueCallout';
import { useAdminWithdrawals, useUnprocessedWebhooks } from '@/hooks/useAdmin';

export function PlatformNeedsAttention() {
    const t = useTranslations('AdminPage');
    const { setTab } = useAdminNavigation();
    const withdrawalsQuery = useAdminWithdrawals();
    const webhooksQuery = useUnprocessedWebhooks();

    const openTab = useCallback((tab: AdminTab) => () => setTab(tab), [setTab]);

    const heldWithdrawals = (withdrawalsQuery.data ?? []).length;
    const unprocessedWebhooks = (webhooksQuery.data ?? []).length;
    const loading = withdrawalsQuery.isLoading || webhooksQuery.isLoading;

    if (loading) return null;

    if (heldWithdrawals === 0 && unprocessedWebhooks === 0) {
        return (
            <p className="flex items-center gap-2 rounded-xl bg-status-good-wash px-4 py-3 text-sm font-semibold text-status-good">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('metrics.attentionClear')}
            </p>
        );
    }

    return (
        <ul className="divide-y divide-status-warn/15 overflow-hidden rounded-xl bg-status-warn-wash">
            {heldWithdrawals > 0 && (
                <PlatformQueueCallout
                    label={t('metrics.heldWithdrawals')}
                    count={heldWithdrawals}
                    action={t('metrics.openQueue')}
                    icon={Undo2}
                    onOpen={openTab('withdrawals')}
                />
            )}
            {unprocessedWebhooks > 0 && (
                <PlatformQueueCallout
                    label={t('metrics.unprocessedWebhooks')}
                    count={unprocessedWebhooks}
                    action={t('metrics.openQueue')}
                    icon={Receipt}
                    onOpen={openTab('billingOps')}
                />
            )}
        </ul>
    );
}
