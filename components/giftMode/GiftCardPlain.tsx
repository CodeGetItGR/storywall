'use client';

import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import type { ChangeEvent } from 'react';

import { GiftCardPinOption } from '@/components/giftMode/GiftCardPinOption';
import type { GiftHandoverResponseDto } from '@/lib/api/types';

const QR_SIZE = 220;

// The gift card for events without QR cards.
export function GiftCardPlain({
    card,
    claimUrl,
    pin,
    includePin,
    onIncludePinChangeAction,
    onPrintAction,
}: {
    card: GiftHandoverResponseDto;
    claimUrl: string | null;
    pin: string | null;
    includePin: boolean;
    onIncludePinChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onPrintAction: () => void;
}) {
    const t = useTranslations('GiftMode.card');

    return (
        <div className="flex flex-col gap-6">
            {/* Card */}
            <div
                data-print-root
                className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-white px-6 py-8 text-center text-[#241f1a] shadow-sm"
            >
                <p className="text-2xl font-bold text-balance">{card.recipientLabel}</p>
                {claimUrl && (
                    <QRCodeSVG value={claimUrl} size={QR_SIZE} level="H" marginSize={2} fgColor="#241f1a" bgColor="#ffffff" title={t('scan')} />
                )}
                <p className="text-sm">{t('scan')}</p>
                {includePin && <p className="font-mono text-lg font-bold tracking-[0.2em]">{t('pin', { pin: pin ?? '' })}</p>}
                {card.recipientEmail && <p className="text-xs break-all text-[#6f665d]">{t('email', { email: card.recipientEmail })}</p>}
                <p className="text-base font-semibold text-balance">{card.giverDisplayName}</p>
            </div>

            {/* Options */}
            <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
                <GiftCardPinOption pin={pin} includePin={includePin} onChangeAction={onIncludePinChangeAction} />
                <button
                    type="button"
                    onClick={onPrintAction}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
                >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    {t('print')}
                </button>
            </div>
        </div>
    );
}
