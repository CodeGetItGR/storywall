import { Skeleton } from '@/components/ui/skeleton';

export function StorySkeleton() {
    return (
        <div className="flex shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-15.5 w-15.5 rounded-xl" />
            <Skeleton className="h-2.5 w-12 rounded-full" />
        </div>
    );
}
