'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { PartnerHero } from '@/components/partners/PartnerHero';
import { PartnerPortalBlocked } from '@/components/partners/PartnerPortalBlocked';
import { PartnerPortalFrame } from '@/components/partners/PartnerPortalFrame';
import { PartnerPortalSkeleton } from '@/components/partners/PartnerPortalSkeleton';
import { PartnerReachSection } from '@/components/partners/PartnerReachSection';
import { MetricStrip } from '@/components/ui/MetricStrip';
import { PageErrorState } from '@/components/ui/PageErrorState';
import { usePartnerPortal } from '@/hooks/usePartnerPortal';
import { partnerBalances, partnerPortalBlock } from '@/lib/partnerPortal';

export function PartnerPortalBoundary() {
    const t = useTranslations('PartnerPortalPage');
    const portal = usePartnerPortal();
    const block = partnerPortalBlock(portal.error);
    const handleRetry = useCallback(() => {
        void portal.refetch();
    }, [portal]);

    if (portal.isLoading) return <PartnerPortalSkeleton />;

    if (block) return <PartnerPortalBlocked block={block} />;

    if (portal.error || !portal.data) {
        return (
            <PageErrorState
                title={t('unavailable.title')}
                description={t('unavailable.description')}
                onRetryAction={handleRetry}
                error={portal.error}
            />
        );
    }

    return (
        <PartnerPortalFrame>
            <div className="flex flex-col gap-4">
                {/* Hero: name, what is owed, commission */}
                <PartnerHero name={portal.data.name} balances={partnerBalances(portal.data.totals)} tierProgress={portal.data.tierProgress} />

                {/* Counts */}
                <section aria-label={t('summary')}>
                    <MetricStrip
                        items={[
                            { key: 'eventsReferred', label: t('eventsReferred'), value: portal.data.eventsReferred },
                            { key: 'brandingClicks', label: t('brandingClicks'), value: portal.data.brandingClicks },
                        ]}
                    />
                </section>

                {/* Reach */}
                <PartnerReachSection reach={portal.data.reach} />
            </div>
        </PartnerPortalFrame>
    );
}
