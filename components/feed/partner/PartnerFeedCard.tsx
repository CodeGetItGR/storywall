'use client';

import { PartnerCompactRow } from '@/components/feed/partner/PartnerCompactRow';
import { PartnerCredit } from '@/components/feed/partner/PartnerCredit';
import { PartnerFeatureCard } from '@/components/feed/partner/PartnerFeatureCard';
import { type PartnerBrandingCardContent, usePartnerBrandingCard } from '@/hooks/usePartnerBrandingCard';
import type { BrandingVariant, PartnerBrandingDto } from '@/lib/api/types';

// One variant from ready content; the admin preview renders all three this way.
export function PartnerCardVariant({
    variant,
    content,
    coverSizes,
}: {
    variant: BrandingVariant;
    content: PartnerBrandingCardContent;
    coverSizes?: string;
}) {
    if (variant === 'FEATURE_CARD') return <PartnerFeatureCard content={content} coverSizes={coverSizes} />;
    if (variant === 'COMPACT_ROW') return <PartnerCompactRow content={content} />;
    return <PartnerCredit content={content} />;
}

// Display only: no reactions, comments, reporting or menu. A tap opens the click redirect in a new tab.
export function PartnerFeedCard({ branding }: { branding: PartnerBrandingDto }) {
    const content = usePartnerBrandingCard(branding);
    return <PartnerCardVariant variant={branding.variant} content={content} />;
}
