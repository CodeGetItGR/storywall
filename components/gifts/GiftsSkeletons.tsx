import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

function GiftFieldSkeleton({ labelWidth, valueWidth }: { labelWidth: string; valueWidth: string }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <Skeleton className={`h-3 rounded-full ${labelWidth}`} />
            <Skeleton className={`h-5 rounded-full ${valueWidth}`} />
        </div>
    );
}

export function GiftAccountSkeleton() {
    return (
        <SkeletonStatus className="flex flex-col">
            {/* Hero */}
            <div className="flex flex-col items-center gap-3 px-2 pt-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-4 w-64 max-w-full rounded-full" />
                <Skeleton className="h-4 w-48 rounded-full" />
            </div>

            {/* Bank details */}
            <div className="mt-3 flex flex-col items-center gap-4 border-t border-border/70 pt-4 pb-2">
                <GiftFieldSkeleton labelWidth="w-20" valueWidth="w-40" />
                <GiftFieldSkeleton labelWidth="w-28" valueWidth="w-36" />
                <GiftFieldSkeleton labelWidth="w-12" valueWidth="w-64 max-w-full" />
                <Skeleton className="h-11 w-32 rounded-full" />
            </div>
        </SkeletonStatus>
    );
}

export function GiftsPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="xl">
            <GiftAccountSkeleton />
        </ModulePageShellSkeleton>
    );
}
