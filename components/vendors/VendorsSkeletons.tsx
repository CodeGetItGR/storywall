import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

// Rows only; each page keeps its own header.
export function VendorRowsSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <SkeletonStatus className="flex flex-col gap-3">
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="flex items-center gap-3 py-2">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-4 w-1/2 rounded-full" />
                        <Skeleton className="h-3 w-1/4 rounded-full" />
                    </div>
                </div>
            ))}
        </SkeletonStatus>
    );
}

// The page frame (back button, title) with rows, for the route's loading state.
export function VendorsPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="2xl">
            <VendorRowsSkeleton rows={4} />
        </ModulePageShellSkeleton>
    );
}
