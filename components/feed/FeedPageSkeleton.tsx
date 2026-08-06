import { Skeleton } from '@/components/ui/skeleton';

function StorySkeleton() {
    return (
        <div className="flex shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-15.5 w-15.5 rounded-xl" />
            <Skeleton className="h-2.5 w-12 rounded-full" />
        </div>
    );
}

function PostSkeleton({ withMedia = false }: { withMedia?: boolean }) {
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

export function FeedPageSkeleton() {
    return (
        <div className="mx-auto flex w-full flex-col lg:max-w-[42rem]" role="status" aria-label="Loading feed">
            <div className="sticky top-0 z-20 flex w-full items-center justify-between gap-4 bg-background/90 px-4 py-5 backdrop-blur-sm">
                <Skeleton className="h-8 w-[8.5rem] rounded-full sm:h-12 sm:w-44" />
                <Skeleton className="h-8 w-24 rounded-full" />
            </div>

            <section className="px-3">
                <Skeleton className="aspect-[3/2] w-full rounded-lg" />
            </section>

            <section className="mt-3 flex items-center justify-between px-4">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-3 w-36 rounded-full" />
            </section>

            <section className="mt-3 border-b border-border bg-background/90 px-4 py-4 backdrop-blur-sm">
                <div className="flex items-start gap-4 overflow-hidden">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <StorySkeleton key={index} />
                    ))}
                </div>
            </section>

            <section className="mt-5">
                <div className="flex flex-col px-0 pb-24 lg:pb-10">
                    <div className="rounded-2xl bg-card p-4 shadow-[0_2px_16px_0_rgba(36,31,26,0.07)]">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-10 flex-1 rounded-full" />
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col">
                        <PostSkeleton withMedia />
                        <PostSkeleton />
                    </div>
                </div>
            </section>
        </div>
    );
}
