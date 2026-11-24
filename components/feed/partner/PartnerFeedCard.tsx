'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { PartnerCardVariant } from '@/components/feed/partner/PartnerCardVariant';
import { AskDatesButton } from '@/components/vendors/inquiries/AskDatesButton';
import { AskDatesSheetFor } from '@/components/vendors/inquiries/AskDatesSheetFor';
import { useAskDates } from '@/hooks/useAskDates';
import { usePartnerBrandingCard } from '@/hooks/usePartnerBrandingCard';
import type { PartnerBrandingDto } from '@/lib/api/types';

// No reactions, comments, reporting or menu. A tap opens the click redirect in a new tab. On the feature card, a guest
// can also ask the partner about a date.
export function PartnerFeedCard({ branding, eventId }: { branding: PartnerBrandingDto; eventId: string }) {
    const t = useTranslations('PartnerCard');
    const content = usePartnerBrandingCard(branding);
    const ask = useAskDates(eventId);
    const { openForCard } = ask;
    const askPartner = useCallback(() => openForCard(branding.displayName), [openForCard, branding.displayName]);
    const action = branding.inquiry ? (
        // Same height and padding as the card's visit button, which it sits next to.
        <AskDatesButton state={branding.inquiry} onAskAction={askPartner} className="h-10 px-3 whitespace-nowrap" />
    ) : undefined;
    // Next to the ask button, the short visit label keeps both on one row on a phone.
    const cardContent = action ? { ...content, visitLabel: t('visitShort') } : content;

    return (
        <>
            <PartnerCardVariant variant={branding.variant} content={cardContent} action={action} />

            {/* Ask sheet */}
            <AskDatesSheetFor ask={ask} />
        </>
    );
}
