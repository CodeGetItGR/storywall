'use client';

import { MetricStripSkeleton } from '@/components/ui/MetricStrip';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { cn } from '@/lib/utils';

// The business page's shape while it loads: the top card, the main column and the side column.
export function BusinessSkeleton() {
    return (
        <SkeletonStatus className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Top card */}
            <div className={cn(VENDOR_SECTION_SURFACE, 'p-5 sm:p-7 lg:col-span-2')}>
                <div className="flex items-center gap-3.5">
                    <Skeleton className="size-12 rounded-2xl" />
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-3.5 w-24" />
                    </div>
                </div>
            </div>

            {/* Main */}
            <div className={cn(VENDOR_SECTION_SURFACE, 'flex flex-col gap-4 p-5')}>
                <Skeleton className="h-5 w-28" />
                <MetricStripSkeleton count={3} />
            </div>

            {/* Side */}
            <div className={cn(VENDOR_SECTION_SURFACE, 'h-40 p-5')}>
                <Skeleton className="h-5 w-32" />
            </div>
        </SkeletonStatus>
    );
}
