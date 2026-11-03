import { ExternalLink } from 'lucide-react';

import type { Locale } from '@/i18n/config';
import type { EventTypeConvention } from '@/lib/api/types';
import { formatInviartPrice, INVIART_IMAGE_SIZE, type InviartCard, inviartProductUrl } from '@/lib/inviart';
import { cn } from '@/lib/utils';

type InviartCardListProps = {
    cards: InviartCard[];
    eventType: EventTypeConvention;
    locale: Locale;
    ctaLabel: string;
    // Read before the crossed-out price, e.g. "Was".
    wasLabel: string;
    className?: string;
};

// INVIART's products as cards: Shopify's photo, title and price, our own button text. Each card
// opens the product on inviart.gr, where people buy. No product schema here, per INVIART's spec.
export function InviartCardList({ cards, eventType, locale, ctaLabel, wasLabel, className }: InviartCardListProps) {
    return (
        <ul
            className={cn(
                'm-0 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto p-0 [scrollbar-width:none]! sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4 [&::-webkit-scrollbar]:hidden!',
                className,
            )}
        >
            {cards.map((card) => (
                <li key={card.handle} className="w-[70%] shrink-0 snap-start sm:w-auto">
                    <a
                        href={inviartProductUrl(card.handle, eventType)}
                        target="_blank"
                        rel="sponsored noopener"
                        className="flex h-full flex-col gap-2 text-inherit! no-underline"
                    >
                        {/* Photo: fixed size and lazy, so it never moves the page */}
                        {card.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={card.image.url}
                                alt={card.image.altText || card.title}
                                width={INVIART_IMAGE_SIZE}
                                height={INVIART_IMAGE_SIZE}
                                loading="lazy"
                                decoding="async"
                                className="aspect-square w-full rounded-2xl bg-[#151313]/5 object-cover"
                            />
                        ) : (
                            <span className="block aspect-square w-full rounded-2xl bg-[#151313]/5" />
                        )}
                        {/* Details */}
                        <span className="text-sm leading-snug font-semibold">{card.title}</span>
                        <span className="flex flex-wrap items-baseline gap-2 text-sm">
                            <span>{formatInviartPrice(locale, card.price)}</span>
                            {card.compareAtPrice && (
                                <s className="opacity-60" aria-label={`${wasLabel} ${formatInviartPrice(locale, card.compareAtPrice)}`}>
                                    {formatInviartPrice(locale, card.compareAtPrice)}
                                </s>
                            )}
                        </span>
                        {/* Button */}
                        <span className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#151313] px-4 text-sm font-semibold text-white">
                            {ctaLabel}
                            <ExternalLink className="h-4 w-4" aria-hidden />
                        </span>
                    </a>
                </li>
            ))}
        </ul>
    );
}
