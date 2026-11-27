'use client';

import { useTranslations } from 'next-intl';

import { type FeedWish, FeedWishCard } from '@/components/feed/modules/FeedWishCard';
import { useSnapCarousel } from '@/hooks/useSnapCarousel';
import { cn } from '@/lib/utils';

// Look C1's row: one big quote card at a time, the next peeking in; swipe for it, the dots show where you are.
export function FeedWishCards({ wishes }: { wishes: readonly FeedWish[] }) {
    const t = useTranslations('FeedModuleBlocks');
    const { scrollerRef, active, onScroll, onDot } = useSnapCarousel();
    const single = wishes.length === 1;

    return (
        <div className="flex w-full flex-col items-center gap-3">
            {/* Cards */}
            <div
                ref={scrollerRef}
                onScroll={onScroll}
                className="-mx-4 no-scrollbar flex w-[calc(100%+2rem)] snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4"
            >
                {wishes.map((wish, index) => (
                    <div key={wish.id} className={cn('shrink-0 snap-center', single ? 'w-full' : 'w-[86%]')}>
                        <FeedWishCard wish={wish} index={index} />
                    </div>
                ))}
            </div>

            {/* Dots */}
            {!single && (
                <div className="flex items-center gap-1">
                    {wishes.map((wish, index) => (
                        <button
                            key={wish.id}
                            type="button"
                            data-index={index}
                            onClick={onDot}
                            aria-label={t('wishPosition', { n: index + 1, total: wishes.length })}
                            aria-current={index === active ? 'true' : undefined}
                            className="flex h-6 min-w-6 items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                            <span
                                className={cn('h-1.5 rounded-full transition-all', index === active ? 'w-5 bg-primary' : 'w-1.5 bg-ink-faint/40')}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
