'use client';

import { useTranslations } from 'next-intl';

import { PartnerCardVariant } from '@/components/feed/partner/PartnerFeedCard';
import { usePartnerBrandingCard } from '@/hooks/usePartnerBrandingCard';
import type { BrandingVariant, PartnerBrandingDto } from '@/lib/api/types';

const PREVIEW_VARIANTS: readonly BrandingVariant[] = ['FEATURE_CARD', 'COMPACT_ROW', 'CREDIT'];
// The cover's real width here: the 22rem side column less the section's and the card's padding on desktop (about
// 296px); the page width less the same padding below that.
const PREVIEW_COVER_SIZES = '(min-width: 1024px) 296px, calc(100vw - 5rem)';

// The three styles the feed can pick for the partner's card, drawn with the real feed components from the same
// content. No link: a tap on a preview must not count as a click.
export function BusinessFeedCardPreview({ branding }: { branding: PartnerBrandingDto }) {
    const t = useTranslations('BusinessPage.previews.variants');
    const content = { ...usePartnerBrandingCard(branding), href: null };

    return (
        <div className="flex flex-col gap-4">
            {PREVIEW_VARIANTS.map((variant) => (
                <figure key={variant} className="flex flex-col gap-1.5">
                    <figcaption className="text-xs font-medium text-ink-muted">{t(variant)}</figcaption>
                    <div className="overflow-hidden rounded-lg bg-event ring-1 ring-border">
                        <PartnerCardVariant variant={variant} content={content} coverSizes={PREVIEW_COVER_SIZES} />
                    </div>
                </figure>
            ))}
        </div>
    );
}
