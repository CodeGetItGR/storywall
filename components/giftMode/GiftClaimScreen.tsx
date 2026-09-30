'use client';

import { useTranslations } from 'next-intl';

import { GiftClaimForm } from '@/components/giftMode/GiftClaimForm';
import { GiftClaimOutcome } from '@/components/giftMode/GiftClaimOutcome';
import { InviteLayout } from '@/components/invite/InviteLayout';
import { InviteOnboardingState } from '@/components/invite/InviteOnboardingState';
import { InviteTerminalState } from '@/components/invite/InviteTerminalState';
import { useGiftClaim } from '@/hooks/useGiftClaim';

const DEFAULT_HERO_IMAGE = '/images/couple-hero.png';

export function GiftClaimScreen({ token }: { token: string }) {
    const t = useTranslations('GiftMode.claim');
    const claim = useGiftClaim(token);
    const preview = claim.preview;

    if (claim.outcome && preview) return <GiftClaimOutcome outcome={claim.outcome} eventTitle={preview.eventTitle} />;

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
                        coverImageSrc={preview.coverMedia?.mediaUrl ?? DEFAULT_HERO_IMAGE}
                        coverImageAlt={t('coverAlt')}
                        eventTitle={preview.eventTitle}
                        eventSubtitle={preview.eventSubtitle}
                    >
                        {/* Gift */}
                        <div className="mb-7 space-y-2">
                            <p className="text-lg font-semibold text-balance text-ink">
                                {t('heading', { giver: preview.giverDisplayName, recipient: preview.recipientLabel })}
                            </p>
                            {preview.emailBound && <p className="text-sm text-ink-muted">{t('emailBound')}</p>}
                        </div>

                        {/* Claim */}
                        <GiftClaimForm claim={claim} />
                    </InviteLayout>
                ) : null
            }
        />
    );
}
