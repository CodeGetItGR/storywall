import { Skeleton } from '@/components/ui/skeleton';

export function EventListItemSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl bg-card shadow-[0_10px_30px_rgba(36,31,26,0.08)]">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-3 p-4">
                <Skeleton className="h-3 w-40 rounded-full" />
                <Skeleton className="h-5 w-48 rounded-full" />
                <Skeleton className="h-3 w-32 rounded-full" />
                <div className="flex items-center justify-between pt-1">
                    <div className="flex -space-x-2">
                        <Skeleton className="h-6 w-6 rounded-full ring-2 ring-card" />
                        <Skeleton className="h-6 w-6 rounded-full ring-2 ring-card" />
                        <Skeleton className="h-6 w-6 rounded-full ring-2 ring-card" />
                    </div>
                    <Skeleton className="h-7 w-16 rounded-full" />
                </div>
            </div>
        </div>
    );
}
