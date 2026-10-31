import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function QrCardDesignerSkeleton() {
    return (
        <SkeletonStatus className="flex flex-col gap-6">
            {/* Card */}
            <Skeleton className="mx-auto aspect-105/148 w-full max-w-xs rounded-lg" />
            {/* Designs */}
            <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="aspect-105/148 w-20 shrink-0 rounded-xl" />
                ))}
            </div>
            {/* Text */}
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            {/* Actions */}
            <Skeleton className="h-11 w-full rounded-full" />
        </SkeletonStatus>
    );
}

export function QrCardPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="xl">
            <QrCardDesignerSkeleton />
        </ModulePageShellSkeleton>
    );
}
