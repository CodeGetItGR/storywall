import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

// Loading shapes for the totals row, the daily line and two tables.
export function VisitorsSkeleton() {
    return (
        <SkeletonStatus className="space-y-5">
            {/* Totals */}
            <Skeleton className="h-24 rounded-xl" />
            {/* Daily line */}
            <Skeleton className="h-56 rounded-xl" />
            {/* Tables */}
            <div className="grid gap-5 lg:grid-cols-2">
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
            </div>
        </SkeletonStatus>
    );
}
