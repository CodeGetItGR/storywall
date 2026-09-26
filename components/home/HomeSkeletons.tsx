import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const HOME_SECTION_CLASS_NAME = 'px-4 sm:px-8 lg:mx-auto lg:w-[clamp(32rem,40vw,42rem)] lg:px-0';

export function EventQuickCardSkeleton() {
    return <Skeleton className="h-62 w-44 shrink-0 rounded-lg lg:h-56 lg:w-40" />;
}

export function EventQuickCardsSkeleton({ count = 3 }: { count?: number }) {
    return Array.from({ length: count }).map((_, index) => <EventQuickCardSkeleton key={index} />);
}

export function HomeNextEventCardSkeleton() {
    return (
        <div className="flex flex-col gap-3">
            {/* Heading */}
            <Skeleton className="mx-1 h-3 w-20 rounded-full" />

            {/* Card */}
            <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card/60">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-40 rounded-full" />
                        <Skeleton className="h-3 w-28 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function HomePageSkeleton() {
    return (
        <SkeletonStatus className="relative flex w-full flex-col gap-6 overflow-x-hidden pt-8 pb-12 lg:pt-14">
            {/* Header */}
            <div className={cn('flex items-center justify-between gap-4 py-2', HOME_SECTION_CLASS_NAME)}>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full sm:h-10 sm:w-10" />
                    <Skeleton className="h-6 w-28 rounded-full sm:h-7" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <Skeleton className="h-11 w-11 rounded-full lg:hidden" />
                </div>
            </div>

            {/* Next event */}
            <div className={HOME_SECTION_CLASS_NAME}>
                <HomeNextEventCardSkeleton />
            </div>

            {/* Your events */}
            <div className="flex flex-col gap-3">
                <div className={cn('flex items-center justify-between gap-3', HOME_SECTION_CLASS_NAME)}>
                    <Skeleton className="h-3 w-24 rounded-full" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                </div>
                <div className={cn('flex gap-3 overflow-hidden pb-3', HOME_SECTION_CLASS_NAME)}>
                    <EventQuickCardsSkeleton />
                </div>
            </div>
        </SkeletonStatus>
    );
}
