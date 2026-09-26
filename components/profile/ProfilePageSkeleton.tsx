import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

function FieldSkeleton() {
    return (
        <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
    );
}

export function ProfilePageSkeleton() {
    return (
        <SkeletonStatus className="relative mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-8 lg:pt-14">
            {/* Header */}
            <div className="flex flex-col gap-3">
                <div className="flex min-h-10 items-center">
                    <Skeleton className="h-3 w-14 rounded-full" />
                </div>
                <Skeleton className="h-7 w-32 rounded-full" />
            </div>

            {/* Personal info */}
            <div className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-32 rounded-full" />
                        <Skeleton className="h-3.5 w-44 rounded-full" />
                    </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <FieldSkeleton />
                    <FieldSkeleton />
                </div>
                <div className="mt-5 flex justify-end">
                    <Skeleton className="h-9 w-24 rounded-full" />
                </div>
            </div>

            {/* Password */}
            <div className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5">
                <Skeleton className="h-4 w-36 rounded-full" />
                <Skeleton className="mt-3 h-3 w-3/4 rounded-full" />
                <div className="mt-5 grid gap-4">
                    <FieldSkeleton />
                    <FieldSkeleton />
                    <FieldSkeleton />
                </div>
            </div>
        </SkeletonStatus>
    );
}
