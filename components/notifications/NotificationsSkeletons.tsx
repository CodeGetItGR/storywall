import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

function NotificationRowSkeleton() {
    return (
        <div className="flex w-full items-start gap-3 px-4 py-3.5">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
                <Skeleton className="h-3.5 w-3/4 rounded-full" />
                <Skeleton className="h-3 w-1/2 rounded-full" />
                <Skeleton className="h-2.5 w-16 rounded-full" />
            </div>
        </div>
    );
}

export function NotificationListSkeleton({ count = 6 }: { count?: number }) {
    return (
        <SkeletonStatus className="pt-5">
            {/* Section label */}
            <Skeleton className="mx-4 mb-2 h-3 w-12 rounded-full" />

            {/* Rows */}
            {Array.from({ length: count }).map((_, index) => (
                <NotificationRowSkeleton key={index} />
            ))}
        </SkeletonStatus>
    );
}

export function NotificationsPageSkeleton() {
    return (
        <div className="mx-auto max-w-2xl pb-8">
            {/* Header */}
            <div className="border-b border-border px-4 py-4" aria-hidden="true">
                <div className="mb-3 flex min-h-10 items-center">
                    <Skeleton className="h-3 w-14 rounded-full" />
                </div>
                <Skeleton className="h-6 w-36 rounded-full" />
                <div className="mt-3 flex gap-2">
                    <Skeleton className="h-6 w-10 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
            </div>

            {/* List */}
            <NotificationListSkeleton />
        </div>
    );
}
