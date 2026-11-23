'use client';

import { type ReactNode, useCallback } from 'react';

import { PartnerCompactRow } from '@/components/feed/partner/PartnerCompactRow';
import { PartnerCredit } from '@/components/feed/partner/PartnerCredit';
import { PartnerFeatureCard } from '@/components/feed/partner/PartnerFeatureCard';
import { AskDatesButton } from '@/components/vendors/inquiries/AskDatesButton';
import { AskDatesSheet } from '@/components/vendors/inquiries/AskDatesSheet';
import { useAskDates } from '@/hooks/useAskDates';
import { type PartnerBrandingCardContent, usePartnerBrandingCard } from '@/hooks/usePartnerBrandingCard';
import type { BrandingVariant, PartnerBrandingDto } from '@/lib/api/types';

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
            {ask.target && (
                <AskDatesSheet
                    name={ask.target.name}
                    date={ask.date}
                    phone={ask.phone}
                    email={ask.email}
                    note={ask.note}
                    consent={ask.consent}
                    dateBounds={ask.dateBounds}
                    dateError={ask.dateError}
                    contactError={ask.contactError}
                    sendError={ask.sendError}
                    sent={ask.sent}
                    isSending={ask.isSending}
                    canSend={ask.canSend}
                    onDateChangeAction={ask.setDate}
                    onPhoneChangeAction={ask.setPhone}
                    onEmailChangeAction={ask.setEmail}
                    onNoteChangeAction={ask.setNote}
                    onConsentChangeAction={ask.setConsent}
                    onSubmitAction={ask.submit}
                    onCloseAction={ask.close}
                />
            )}
        </>
    );
}
