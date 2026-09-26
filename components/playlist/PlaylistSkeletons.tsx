import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

function PlaylistItemRowSkeleton() {
    return (
        <div className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-border/60 bg-card px-4 py-3.5 shadow-[0_18px_36px_rgba(35,28,22,0.07)] sm:px-5">
            {/* Details */}
            <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded-full" />
                <Skeleton className="h-3.5 w-24 rounded-full" />
                <div className="flex gap-2 pt-1">
                    <Skeleton className="h-7 w-28 rounded-full" />
                </div>
            </div>

            {/* Voting */}
            <div className="flex shrink-0 items-center gap-2">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-12 w-12 rounded-2xl" />
            </div>
        </div>
    );
}

export function PlaylistListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <SkeletonStatus className="flex flex-col gap-2.5">
            {Array.from({ length: count }).map((_, index) => (
                <PlaylistItemRowSkeleton key={index} />
            ))}
        </SkeletonStatus>
    );
}

export function PlaylistPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="2xl" withAction>
            <PlaylistListSkeleton />
        </ModulePageShellSkeleton>
    );
}
