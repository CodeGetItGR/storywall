import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function CheckoutReviewSkeleton() {
    return (
        <SkeletonStatus className="mx-auto max-w-3xl px-4 pt-6 pb-28 sm:pt-10 sm:pb-12">
            {/* Back */}
            <div className="flex min-h-10 items-center">
                <Skeleton className="h-3 w-14 rounded-full" />
            </div>

            {/* Header */}
            <div className="mt-4 space-y-2">
                <Skeleton className="h-7 w-56 rounded-full sm:h-8" />
                <Skeleton className="h-3.5 w-3/4 rounded-full" />
            </div>

            {/* Purchase summary */}
            <div className="mt-6 grid grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="space-y-1.5">
                        <Skeleton className="h-3 w-16 rounded-full" />
                        <Skeleton className="h-4 w-28 rounded-full" />
                    </div>
                ))}
            </div>

            {/* Payment breakdown */}
            <div className="mt-6">
                <Skeleton className="h-4 w-36 rounded-full" />
                <div className="mt-3 space-y-3 rounded-lg bg-surface-muted/55 p-4">
                    <div className="flex items-center justify-between gap-6">
                        <Skeleton className="h-3.5 w-40 rounded-full bg-background" />
                        <Skeleton className="h-3.5 w-16 rounded-full bg-background" />
                    </div>
                    <div className="flex items-center justify-between gap-6">
                        <Skeleton className="h-4 w-16 rounded-full bg-background" />
                        <Skeleton className="h-5 w-20 rounded-full bg-background" />
                    </div>
                </div>
            </div>

            {/* Payment consequence */}
            <div className="mt-6 space-y-2">
                <Skeleton className="h-3.5 w-full rounded-full" />
                <Skeleton className="h-3.5 w-2/3 rounded-full" />
            </div>

            {/* Checkout action */}
            <Skeleton className="mt-8 h-12 w-full rounded-full sm:w-56" />
        </SkeletonStatus>
    );
}

export function CheckoutSuccessSkeleton() {
    return (
        <SkeletonStatus className="mx-auto max-w-xl px-4 py-10 sm:py-16">
            {/* Payment status */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 sm:p-8">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-7 w-52 rounded-full" />
                <Skeleton className="h-3.5 w-64 max-w-full rounded-full" />
                <Skeleton className="mt-3 h-11 w-full rounded-full sm:w-40" />
            </div>
        </SkeletonStatus>
    );
}
