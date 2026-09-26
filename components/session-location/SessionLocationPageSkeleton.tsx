import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function SessionLocationPageSkeleton() {
    return (
        <SkeletonStatus className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-background px-6 pt-4 pb-14">
            {/* Header */}
            <div className="flex min-h-10 items-center">
                <Skeleton className="h-3 w-14 rounded-full" />
            </div>

            {/* Location */}
            <div className="flex flex-1 flex-col items-center justify-center gap-5 py-14">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex flex-col items-center gap-3">
                    <Skeleton className="h-8 w-48 rounded-full" />
                    <Skeleton className="h-5 w-40 rounded-full" />
                </div>
                <Skeleton className="h-11 w-32 rounded-full" />
            </div>
        </SkeletonStatus>
    );
}
