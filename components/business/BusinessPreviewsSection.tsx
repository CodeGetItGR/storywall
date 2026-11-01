'use client';

import { useTranslations } from 'next-intl';

import { BusinessFeedCardPreview } from '@/components/business/BusinessFeedCardPreview';
import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { SneakPeekSample } from '@/components/business/SneakPeekSample';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import type { PartnerBrandingDto } from '@/lib/api/types';

// What guests see from the vendor: their card in the feed (partners) and a sneak peek post (Pro album types).
export function BusinessPreviewsSection({
    cardPreview,
    showSneakPeek,
    name,
    logoUrl,
}: {
    cardPreview: PartnerBrandingDto | null;
    showSneakPeek: boolean;
    name: string;
    logoUrl: string | null;
}) {
    const t = useTranslations('BusinessPage.previews');

    return (
        <VendorMeSection id="business-previews-title" title={t('title')} icon={<BusinessSectionIcon section="previews" />}>
            {/* Feed card */}
            {cardPreview && (
                <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold text-ink">{t('feedCard')}</h4>
                    <BusinessFeedCardPreview branding={cardPreview} />
                </div>
            )}

            {/* Sneak peek */}
            {showSneakPeek && (
                <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-semibold text-ink">{t('sneakPeek')}</h4>
                    <SneakPeekSample name={name} logoUrl={logoUrl} />
                </div>
            )}
        </VendorMeSection>
    );
}
