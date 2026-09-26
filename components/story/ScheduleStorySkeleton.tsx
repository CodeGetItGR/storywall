import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

// The story screen sits on the muted surface, so its blocks use a darker tint
// than the default skeleton to stay visible.
const blockClassName = 'bg-ink/8';

export function ScheduleStorySkeleton() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-muted">
            <SkeletonStatus className="relative h-full max-h-dvh w-full max-w-sm overflow-hidden">
                {/* Progress */}
                <Skeleton className={`absolute top-3 right-3 left-3 h-0.5 rounded-full ${blockClassName}`} />

                {/* Header */}
                <div className="absolute top-6 right-0 left-0 flex items-center justify-between px-4 pt-2">
                    <div className="flex items-center gap-2.5">
                        <Skeleton className={`h-9 w-9 rounded-full ${blockClassName}`} />
                        <div className="space-y-1.5">
                            <Skeleton className={`h-3 w-24 rounded-full ${blockClassName}`} />
                            <Skeleton className={`h-2.5 w-32 rounded-full ${blockClassName}`} />
                        </div>
                    </div>
                    <Skeleton className={`h-8 w-8 rounded-full ${blockClassName}`} />
                </div>

                {/* Schedule */}
                <div className="flex flex-col px-5 pt-24">
                    <div className="mb-3 flex items-center gap-3">
                        <Skeleton className="h-11 w-11 rounded-full bg-background" />
                        <Skeleton className={`h-3.5 w-24 rounded-full ${blockClassName}`} />
                    </div>
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="flex flex-col gap-3 border-t border-border py-5 first:border-t-0">
                            <div className="flex items-center gap-5">
                                <Skeleton className={`h-2.5 w-2.5 rounded-full ${blockClassName}`} />
                                <Skeleton className={`h-3.5 w-24 rounded-full ${blockClassName}`} />
                            </div>
                            <div className="ml-7.5 space-y-2">
                                <Skeleton className={`h-6 w-44 rounded-full ${blockClassName}`} />
                                <Skeleton className={`h-3 w-32 rounded-full ${blockClassName}`} />
                            </div>
                        </div>
                    ))}
                </div>
            </SkeletonStatus>
        </div>
    );
}
