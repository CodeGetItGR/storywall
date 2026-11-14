'use client';

import { useTranslations } from 'next-intl';

import { GiftClaimCelebration } from '@/components/giftMode/GiftClaimCelebration';
import { GiftClaimForm } from '@/components/giftMode/GiftClaimForm';
import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteOnboardingState } from '@/components/invite/InviteOnboardingState';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { useGiftClaim } from '@/hooks/useGiftClaim';

export function GiftClaimScreen({ token }: { token: string }) {
    const t = useTranslations('GiftMode.claim');
    const claim = useGiftClaim(token);
    const preview = claim.preview;

    if (claim.outcome) return <GiftClaimCelebration outcome={claim.outcome} />;

    const blocked = claim.block ?? (!claim.isLoading && !preview ? 'invalid' : null);

    return (
        <InviteOnboardingState
            isLoading={claim.isLoading}
            terminalState={
                blocked ? <InviteTerminalState title={t(`blocked.${blocked}.title`)} description={t(`blocked.${blocked}.description`)} /> : null
            }
            content={
                preview ? (
                    <InviteLayout
                        coverImageSrc={preview.coverMedia?.mediaUrl}
                        coverImageAlt={t('coverAlt')}
                        eventTitle={preview.eventTitle}
                        eventSubtitle={preview.eventSubtitle}
                    >
                        {/* Gift */}
                        <p className="mb-7 text-lg font-semibold text-balance text-ink">
                            {t('heading', { giver: preview.giverDisplayName, recipient: preview.recipientLabel })}
                        </p>

                        {/* Claim */}
                        <GiftClaimForm claim={claim} />
                    </InviteLayout>
                ) : null
            }
        />
    );
}
