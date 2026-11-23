'use client';

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
    const content = usePartnerBrandingCard(branding);
    const ask = useAskDates(eventId);
    const { openForCard } = ask;
    const askPartner = useCallback(() => openForCard(branding.displayName), [openForCard, branding.displayName]);
    const action = branding.inquiry ? (
        <AskDatesButton state={branding.inquiry} onAskAction={askPartner} />
    ) : undefined;

    return (
        <>
            <PartnerCardVariant variant={branding.variant} content={content} action={action} />

            {/* Ask sheet */}
            <AskDatesSheetFor ask={ask} />
        </>
    );
}
