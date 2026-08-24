'use client';

import { CheckCircle2, Receipt, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { type AdminTab, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { PlatformQueueCallout } from '@/components/admin/PlatformQueueCallout';
import { useAdminRefundRequests, useUnprocessedWebhooks } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';

export function PlatformNeedsAttention() {
    const t = useTranslations('AdminPage');
    const { setTab } = useAdminNavigation();
    const refundsQuery = useAdminRefundRequests();
    const webhooksQuery = useUnprocessedWebhooks();

    const openTab = useCallback((tab: AdminTab) => () => setTab(tab), [setTab]);

    const pendingRefunds = (refundsQuery.data ?? []).filter((row) => row.request.status === 'PENDING').length;
    const unprocessedWebhooks = (webhooksQuery.data ?? []).length;
    const loading = refundsQuery.isLoading || webhooksQuery.isLoading;
    const clear = pendingRefunds === 0 && unprocessedWebhooks === 0;

    if (loading) return null;

    return (
        <div className={cn('flex flex-wrap gap-3', clear && 'text-sm')}>
            {clear ? (
                <p className="inline-flex items-center gap-2 border border-status-good-wash bg-status-good-wash px-4 py-3 text-sm font-semibold text-status-good">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {t('metrics.attentionClear')}
                </p>
            ) : (
                <>
                    {pendingRefunds > 0 && (
                        <PlatformQueueCallout
                            label={t('metrics.pendingRefunds')}
                            count={pendingRefunds}
                            action={t('metrics.openQueue')}
                            icon={Undo2}
                            onOpen={openTab('refunds')}
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
                </>
            )}
        </div>
    );
}
