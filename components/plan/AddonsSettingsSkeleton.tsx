import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function AddonsSettingsSkeleton() {
    return (
        <SkeletonStatus className="mx-auto max-w-3xl px-4 pt-5 pb-24 sm:pt-6 lg:pb-10">
            {/* Back */}
            <div className="flex min-h-10 items-center">
                <Skeleton className="h-3 w-24 rounded-full" />
            </div>

            {/* Header */}
            <div className="mt-4 space-y-2">
                <Skeleton className="h-7 w-44 rounded-full" />
                <Skeleton className="h-3.5 w-3/4 rounded-full" />
            </div>

            {/* Storage packs */}
            <div className="mt-6 rounded-lg bg-surface-muted/45 p-4">
                <div className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded-md bg-background" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-32 rounded-full bg-background" />
                        <Skeleton className="h-3.5 w-3/4 rounded-full bg-background" />
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-10 w-28 rounded-full bg-background" />
                    ))}
                </div>
            </div>
        </SkeletonStatus>
    );
}
