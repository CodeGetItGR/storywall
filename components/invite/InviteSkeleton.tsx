import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function InviteSkeleton() {
    return (
        <SkeletonStatus className="mx-auto flex h-full min-h-screen w-full max-w-xl flex-col overflow-hidden bg-background md:px-6 md:pt-6">
            {/* Hero */}
            <Skeleton className="h-64 w-full shrink-0 rounded-none md:h-80 md:rounded-3xl" />

            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 pt-8 pb-8">
                {/* Details */}
                <div className="space-y-4">
                    {[0, 1].map((row) => (
                        <div key={row} className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3.5 w-3/5 rounded-full" />
                                <Skeleton className="h-3.5 w-2/5 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <Skeleton className="mt-auto h-11 w-full rounded-full md:mt-8" />
            </div>
        </SkeletonStatus>
    );
}
