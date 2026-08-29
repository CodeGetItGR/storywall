'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { StoragePackPurchase } from '@/components/plan/StoragePackPurchase';
import { BackButton } from '@/components/ui/BackButton';
import { PageErrorState } from '@/components/ui/PageErrorState';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventBilling } from '@/hooks/useBilling';
import { scopedPlans } from '@/lib/planTiers';
import { routes } from '@/lib/routes';

export default function EventAddonsSettingsBoundary() {
    const { eventId } = useParams<{ eventId: string }>();
    const t = useTranslations('EventAddonsSettingsPage');
    const tBilling = useTranslations('EventPlanSettingsPage');
    const tPageError = useTranslations('PageErrorState.billing');
    const appConfig = useAppConfig();
    const billing = useEventBilling(eventId, true);
    const data = billing.data;
    const retry = useCallback(() => {
        void appConfig.refetch();
        void billing.refetch();
    }, [appConfig, billing]);

    const currentPlan = useMemo(
        () => scopedPlans(appConfig.data?.planTiers ?? [], 'EVENT').find((plan) => plan.code === data?.planTierCode) ?? null,
        [appConfig.data?.planTiers, data?.planTierCode]
    );

    const storagePacks = useMemo(
        () =>
            (appConfig.data?.paidServices ?? []).filter(
                (service) =>
                    service.kind === 'STORAGE_PACK' &&
                    (service.planTierIds.length === 0 || (currentPlan ? service.planTierIds.includes(currentPlan.id) : false))
            ),
        [appConfig.data?.paidServices, currentPlan]
    );

    if (appConfig.isLoading || billing.isLoading) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-10">
                <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
                <div className="mt-6 h-64 animate-pulse rounded-lg bg-surface-muted" />
            </main>
        );
    }

    if (appConfig.error || billing.error || !data) {
        return (
            <PageErrorState
                title={tPageError('title')}
                description={tPageError('description')}
                onRetryAction={retry}
                actionHref={routes.events.manage(eventId, { tab: 'billing' })}
                actionLabel={t('backToBilling')}
            />
        );
    }

    return (
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:pt-6 lg:pb-10">
            <BackButton href={routes.events.manage(eventId, { tab: 'billing' })} label={t('backToBilling')} />

            <section className="mt-4">
                <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{t('subtitle')}</p>
            </section>

            <div className="mt-6 rounded-lg bg-surface-muted/45 p-4">
                {data.eventStatus === 'ACTIVE' && storagePacks.length > 0 ? (
                    <StoragePackPurchase eventId={eventId} services={storagePacks} />
                ) : (
                    <div>
                        <h2 className="text-sm font-bold text-ink">{tBilling('storagePacks.title')}</h2>
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{data.eventStatus === 'ACTIVE' ? t('empty') : t('inactive')}</p>
                    </div>
                )}
            </div>
        </main>
    );
}
