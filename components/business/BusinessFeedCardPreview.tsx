'use client';

import { useTranslations } from 'next-intl';

import { PartnerCardVariant } from '@/components/feed/partner/PartnerFeedCard';
import { usePartnerBrandingCard } from '@/hooks/usePartnerBrandingCard';
import type { BrandingVariant, PartnerBrandingDto } from '@/lib/api/types';

const PREVIEW_VARIANTS: readonly BrandingVariant[] = ['FEATURE_CARD', 'COMPACT_ROW', 'CREDIT'];

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
                        <PartnerCardVariant variant={variant} content={content} />
                    </div>
                </figure>
            ))}
        </div>
    );
}
