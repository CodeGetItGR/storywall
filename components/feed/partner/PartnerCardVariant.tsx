'use client';

import type { ReactNode } from 'react';

import { PartnerCompactRow } from '@/components/feed/partner/PartnerCompactRow';
import { PartnerCredit } from '@/components/feed/partner/PartnerCredit';
import { PartnerFeatureCard } from '@/components/feed/partner/PartnerFeatureCard';
import type { PartnerBrandingCardContent } from '@/hooks/usePartnerBrandingCard';
import type { BrandingVariant } from '@/lib/api/types';

// One variant from ready content; the admin preview renders all three this way.
export function PartnerCardVariant({
    variant,
    content,
    coverSizes,
    action,
}: {
    variant: BrandingVariant;
    content: PartnerBrandingCardContent;
    coverSizes?: string;
    action?: ReactNode;
}) {
    if (variant === 'FEATURE_CARD') return <PartnerFeatureCard content={content} coverSizes={coverSizes} action={action} />;
    if (variant === 'COMPACT_ROW') return <PartnerCompactRow content={content} />;
    return <PartnerCredit content={content} />;
}
