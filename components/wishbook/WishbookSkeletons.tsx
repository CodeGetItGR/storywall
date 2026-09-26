import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function WishbookEntriesSkeleton({ count = 3 }: { count?: number }) {
    return (
        <SkeletonStatus className="space-y-3">
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="rounded-[1.5rem] bg-surface-muted/70 px-4 py-4">
                    <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-28 rounded-full bg-background" />
                        <Skeleton className="h-3 w-36 rounded-full bg-background" />
                    </div>
                    <div className="mt-3 space-y-2">
                        <Skeleton className="h-3.5 w-full rounded-full bg-background" />
                        <Skeleton className="h-3.5 w-2/3 rounded-full bg-background" />
                    </div>
                </div>
            ))}
        </SkeletonStatus>
    );
}

export function WishbookPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="2xl" withSubtitle>
            <SkeletonStatus>
                {/* Header art */}
                <div className="flex justify-center px-2 pt-8">
                    <Skeleton className="h-24 w-24 rounded-full" />
                </div>

                {/* Composer */}
                <div className="mt-8 space-y-4">
                    <Skeleton className="min-h-56 w-full rounded-[1.5rem]" />
                    <div className="flex items-center justify-between gap-3">
                        <Skeleton className="h-3 w-20 rounded-full" />
                        <Skeleton className="h-10 w-40 rounded-full" />
                    </div>
                </div>
            </SkeletonStatus>
        </ModulePageShellSkeleton>
    );
}
