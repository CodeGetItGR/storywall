'use client';

import { useTranslations } from 'next-intl';

import { PartnerPortalFrame } from '@/components/partners/PartnerPortalFrame';
import { MetricStripSkeleton } from '@/components/ui/MetricStrip';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { cn } from '@/lib/utils';

// The partner page's shape while it loads: the hero, the counts and the reach section.
export function PartnerPortalSkeleton() {
    const t = useTranslations('PartnerPortalPage');

    return (
        <PartnerPortalFrame>
            <SkeletonStatus aria-label={t('loading')} className="flex flex-col gap-4">
                {/* Hero */}
                <div className={cn(VENDOR_SECTION_SURFACE, 'p-5 sm:p-7')}>
                    <div className="flex items-center gap-3.5">
                        <Skeleton className="size-12 rounded-2xl" />
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-3.5 w-24" />
                        </div>
                    </div>
                    <Skeleton className="mt-8 h-3 w-20" />
                    <Skeleton className="mt-3 h-9 w-36" />
                    <Skeleton className="mt-3 h-3.5 w-48" />
                </div>

                {/* Counts */}
                <MetricStripSkeleton count={2} />

                {/* Reach */}
                <div className={cn(VENDOR_SECTION_SURFACE, 'p-5 sm:p-6')}>
                    <Skeleton className="h-4 w-20" />
                    <MetricStripSkeleton count={4} className="mt-4" />
                    <div className="mt-6 flex flex-col gap-4">
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                    </div>
                </div>
            </SkeletonStatus>
        </PartnerPortalFrame>
    );
}
