import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function HeOrSheSkeleton() {
    return (
        <SkeletonStatus className="space-y-6">
            {/* Guess */}
            <Skeleton className="mx-auto h-4 w-32 rounded-full" />
            <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
            </div>

            {/* Send */}
            <Skeleton className="h-11 w-full rounded-full" />
        </SkeletonStatus>
    );
}

export function HeOrShePageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="xl">
            <HeOrSheSkeleton />
        </ModulePageShellSkeleton>
    );
}
