import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function InviteSkeleton() {
    return (
        <SkeletonStatus className="flex h-full min-h-screen flex-col overflow-hidden bg-background lg:flex-row">
            {/* Cover */}
            <Skeleton className="h-64 w-full shrink-0 rounded-none md:h-130 lg:h-auto lg:w-1/2" />

            {/* Details */}
            <div className="flex flex-1 flex-col items-center px-6 py-8 lg:w-1/2 lg:p-12">
                <div className="flex w-full max-w-sm flex-col items-center lg:max-w-md">
                    <div className="mb-6 flex flex-col items-center gap-3">
                        <Skeleton className="h-7 w-7 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <div className="w-full space-y-2">
                        <Skeleton className="h-3.5 w-full rounded-full" />
                        <Skeleton className="h-3.5 w-4/5 rounded-full" />
                    </div>
                    <div className="mt-7 flex w-full flex-col gap-3">
                        <Skeleton className="h-11 w-full rounded-full" />
                        <Skeleton className="h-11 w-full rounded-full" />
                    </div>
                </div>
            </div>
        </SkeletonStatus>
    );
}
