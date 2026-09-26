import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

function ScheduleTimelineItemSkeleton({ isLast }: { isLast: boolean }) {
    return (
        <div className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-3">
            {/* Rail */}
            <div className="relative flex justify-center">
                <Skeleton className="relative z-10 mt-1.5 h-3 w-3 rounded-full" />
                {!isLast && <span className="absolute top-4 -bottom-1.5 w-0.5 rounded-full bg-surface-muted" />}
            </div>

            {/* Session */}
            <div className={isLast ? undefined : 'pb-6'}>
                <Skeleton className="h-3.5 w-24 rounded-full" />
                <div className="mt-2 space-y-2.5 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                        <Skeleton className="h-4.5 w-40 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-3/4 rounded-full" />
                    <Skeleton className="h-3 w-28 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export function SchedulePageSkeleton() {
    return (
        <ModulePageShellSkeleton withSubtitle>
            <SkeletonStatus>
                {/* Day */}
                <Skeleton className="mb-3 h-5 w-44 rounded-full" />

                {/* Timeline */}
                {Array.from({ length: 3 }).map((_, index) => (
                    <ScheduleTimelineItemSkeleton key={index} isLast={index === 2} />
                ))}
            </SkeletonStatus>
        </ModulePageShellSkeleton>
    );
}
