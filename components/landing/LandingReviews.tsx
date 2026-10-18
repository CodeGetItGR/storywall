'use client';

import { Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { EventTypeConvention } from '@/lib/api/types';
import { landingSectionAttributes } from '@/lib/landingTracking';
import { landingReviewsFor, REVIEW_STAR_VALUES } from '@/lib/reviews';
import { cn } from '@/lib/utils';

// Featured reviews from GET /api/config (prefetched by LandingPage). No review
// structured data: Google gives no rich results for reviews a site shows about itself.
// An occasion page shows only reviews from its own event type.
export function LandingReviews({ eventType }: { eventType?: EventTypeConvention }) {
    const t = useTranslations('LandingPage.reviews');
    const locale = useLocale();
    const { data: config } = useAppConfig();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();
    const reviews = landingReviewsFor(config?.landingReviews, locale).filter((review) => !eventType || review.eventType === eventType);

    if (reviews.length === 0) return null;

    return (
        /* Reviews */
        <section
            className="relative block bg-white px-5 pt-12 pb-14.5 font-[Arial,Helvetica,sans-serif] text-[#151313] min-[761px]:px-[clamp(24px,7vw,120px)] min-[761px]:pt-16 min-[761px]:pb-18"
            id="reviews"
            {...landingSectionAttributes('reviews')}
        >
            {/* Heading */}
            <h2 className="mx-auto mb-7.5 w-full max-w-295 [font-family:var(--editorial)] text-[56px] leading-[0.85] font-normal tracking-[-0.06em] min-[761px]:text-[clamp(56px,5.5vw,88px)]">
                {t('heading')}
            </h2>

            {/* List */}
            <ul className="mx-auto grid w-full max-w-295 grid-cols-1 gap-x-10 gap-y-8 border-t border-[rgb(21_19_19/26%)] pt-8 min-[761px]:grid-cols-3">
                {reviews.map((review) => (
                    <li key={review.id} className="flex flex-col gap-3">
                        <p className="flex gap-0.5" aria-label={t('stars', { count: review.stars })} role="img">
                            {REVIEW_STAR_VALUES.map((count) => (
                                <Star
                                    key={count}
                                    aria-hidden
                                    className={cn('h-4 w-4', count <= review.stars ? 'fill-[#151313] text-[#151313]' : 'text-[rgb(21_19_19/30%)]')}
                                />
                            ))}
                        </p>
                        <blockquote className="m-0 text-[17px] leading-[1.45] whitespace-pre-wrap">{review.comment}</blockquote>
                        <p className="text-[13px] text-[rgb(21_19_19/70%)]">
                            {review.firstName} · {t(`role.${review.role}`)} · {eventTypeCopy(review.eventType).name}
                        </p>
                    </li>
                ))}
            </ul>
        </section>
    );
}
