import { Skeleton } from '@/components/ui/skeleton';

export function PostSkeleton({ withMedia = false }: { withMedia?: boolean }) {
    return (
        <article className="overflow-hidden rounded-2xl bg-card shadow-[0_2px_16px_0_rgba(36,31,26,0.07)]">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-28 rounded-full" />
                        <Skeleton className="h-2.5 w-[4.5rem] rounded-full" />
                    </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="space-y-2 px-4 pb-3">
                <Skeleton className="h-3 w-full rounded-full" />
                <Skeleton className="h-3 w-4/5 rounded-full" />
            </div>
            {withMedia && <Skeleton className="aspect-4/3 w-full rounded-none" />}
            <div className="flex items-center gap-2 px-4 py-3">
                <Skeleton className="h-7 w-16 rounded-full" />
                <Skeleton className="h-7 w-16 rounded-full" />
            </div>
        </article>
    );
}
