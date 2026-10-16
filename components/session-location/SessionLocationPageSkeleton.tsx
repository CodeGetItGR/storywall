import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function SessionLocationPageSkeleton() {
    return (
        <SkeletonStatus className="mx-auto flex w-full max-w-2xl flex-col px-6 pt-4 pb-10 lg:pb-16">
            {/* Header */}
            <div className="flex min-h-10 items-center">
                <Skeleton className="h-3 w-14 rounded-full" />
            </div>

            {/* Location */}
            <div className="flex flex-col items-center gap-5 pt-10 lg:pt-16">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-8 w-48 rounded-full" />
            </div>

            {/* Details */}
            <div className="mx-auto mt-8 grid w-fit gap-3">
                <Skeleton className="h-5 w-56 rounded-full" />
                <Skeleton className="h-5 w-32 rounded-full" />
                <Skeleton className="h-5 w-44 rounded-full" />
            </div>

            {/* Map */}
            <Skeleton className="mt-8 h-80 w-full rounded-2xl" />
        </SkeletonStatus>
    );
}
