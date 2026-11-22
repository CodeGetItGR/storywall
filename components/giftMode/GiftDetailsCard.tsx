'use client';

import { QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';

import { Logo } from '@/components/common/Logo';
import { useGiftDetailsCard } from '@/hooks/useGiftDetailsCard';
import type { GiftHandoverResponseDto } from '@/lib/api/types';

const QR_SIZE = 112;

// The gift drawn as its card: the logo, the event, who it's for and from, and the live card's QR.
// Before a card is made (or once it's used up) a faded QR stands in its place.
export function GiftDetailsCard({ eventId, gift }: { eventId: string; gift: GiftHandoverResponseDto }) {
    const t = useTranslations('GiftMode.manage');
    const tCard = useTranslations('GiftMode.card');
    const card = useGiftDetailsCard(eventId, gift);

    return (
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_-12px_rgba(228,130,121,0.45)] ring-1 ring-[#F3DED5]">
            {/* Ribbon */}
            <div aria-hidden="true" className="h-1.5 bg-[linear-gradient(90deg,#C777B1,#E48279_45%,#F2885C_60%,#FEC463)]" />

            <div className="flex flex-col gap-5 p-5 sm:p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <Logo iconClassName="h-6 w-auto" wordmarkClassName="h-4 w-auto" wordmarkVariant="gradient" className="gap-2" />
                    {(card.eventTitle || card.eventDate) && (
                        <div className="min-w-0 text-right">
                            {card.eventTitle && <p className="truncate text-sm font-semibold text-ink">{card.eventTitle}</p>}
                            {card.eventDate && <p className="text-xs text-ink-muted">{card.eventDate}</p>}
                        </div>
                    )}
                </div>

                <div className="flex items-end gap-5">
                    {/* Details */}
                    <dl className="flex min-w-0 flex-1 flex-col gap-3">
                        <div>
                            <dt className="text-xs text-ink-muted">{t('recipient')}</dt>
                            <dd className="text-xl leading-tight font-semibold text-balance break-words text-ink">{gift.recipientLabel}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-ink-muted">{t('giver')}</dt>
                            <dd className="text-sm font-medium break-words text-ink">{gift.giverDisplayName}</dd>
                        </div>
                        {gift.recipientEmail && (
                            <div>
                                <dt className="text-xs text-ink-muted">{t('email')}</dt>
                                <dd className="text-sm break-all text-ink">{gift.recipientEmail}</dd>
                            </div>
                        )}
                    </dl>

                    {/* QR */}
                    <div className="flex shrink-0 flex-col items-center gap-1.5">
                        {card.claimUrl ? (
                            <QRCodeSVG value={card.claimUrl} size={QR_SIZE} level="M" marginSize={0} fgColor="#241f1a" bgColor="#ffffff" title={tCard('scan')} />
                        ) : (
                            <div className="flex size-[112px] items-center justify-center rounded-2xl bg-[#FFF0EB]">
                                <QrCode className="size-10 text-[#E48279] opacity-40" aria-hidden="true" />
                            </div>
                        )}
                        {card.claimUrl && <p className="max-w-[112px] text-center text-[11px] leading-tight text-ink-muted">{tCard('scan')}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
