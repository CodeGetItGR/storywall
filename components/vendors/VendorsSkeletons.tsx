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

// The guests' vendor cards: a cover, the overlapping logo, then name and type.
export function VendorCardsSkeleton({ cards = 4 }: { cards?: number }) {
    return (
        <SkeletonStatus className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: cards }, (_, index) => (
                <div key={index} className="overflow-hidden rounded-[1.75rem] ring-1 ring-ink/5">
                    <Skeleton className="aspect-[3/1] w-full rounded-none" />
                    <div className="flex flex-col gap-1.5 px-4 pb-4">
                        <Skeleton className="-mt-8 size-16 rounded-[1.1rem] ring-4 ring-card" />
                        <Skeleton className="mt-1 h-4 w-1/2 rounded-full" />
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
