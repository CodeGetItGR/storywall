import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function GalleryMediaGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <SkeletonStatus className="grid grid-cols-2 gap-3 px-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: count }).map((_, index) => (
                <Skeleton key={index} className="aspect-square w-full rounded-md" />
            ))}
        </SkeletonStatus>
    );
}

export function GalleryPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="5xl" withSubtitle>
            {/* Upload */}
            <div
                className="mb-5 flex flex-col gap-4 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                aria-hidden="true"
            >
                <div className="space-y-2">
                    <Skeleton className="h-3.5 w-28 rounded-full" />
                    <Skeleton className="h-3 w-52 rounded-full" />
                </div>
                <Skeleton className="h-10 w-36 rounded-full" />
            </div>

            {/* Actions */}
            <div className="mb-5 flex justify-between gap-2" aria-hidden="true">
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-36 rounded-full" />
            </div>

            {/* Gallery */}
            <GalleryMediaGridSkeleton />
        </ModulePageShellSkeleton>
    );
}

export function GalleryQrCodeSkeleton() {
    return (
        <SkeletonStatus className="flex flex-col items-center">
            <div className="w-full max-w-xs">
                {/* Code */}
                <div className="flex justify-center rounded-2xl bg-white p-5">
                    <Skeleton className="aspect-square w-full max-w-[280px] rounded-lg" />
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-9 min-w-28 flex-1 rounded-full" />
                    ))}
                </div>
            </div>
            <Skeleton className="mt-5 h-3 w-56 rounded-full" />
        </SkeletonStatus>
    );
}

export function GalleryQrPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="xl" withSubtitle>
            <GalleryQrCodeSkeleton />
        </ModulePageShellSkeleton>
    );
}
