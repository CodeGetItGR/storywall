import { useTranslations } from 'next-intl';

import { PostSkeleton } from '@/components/feed/PostSkeleton';
import { StorySkeleton } from '@/components/feed/StorySkeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function FeedPageSkeleton() {
    const t = useTranslations('FeedPage');

    return (
        <div className="mx-auto flex w-full flex-col lg:max-w-[42rem]" role="status" aria-label={t('loading')}>
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
