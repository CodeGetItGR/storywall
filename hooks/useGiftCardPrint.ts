'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useState, useSyncExternalStore } from 'react';

import { useEventGift, useIssuedGiftCard } from '@/hooks/useGift';
import { useQrCardDesigner } from '@/hooks/useQrCardDesigner';
import { useQrCardExport } from '@/hooks/useQrCardExport';
import { useQrCardTemplates } from '@/hooks/useQrCardTemplates';
import type { QrCardTemplateDto } from '@/lib/api/types';
import { canPrintGiftCard, giftClaimUrl } from '@/lib/gift';
import { giftQrCardLines } from '@/lib/qrCard';

const NO_TEMPLATES: QrCardTemplateDto[] = [];

function subscribeToNothing() {
    return () => {};
}

/**
 * The printable claim card: the live card's QR, and its PIN when the card was
 * issued in this visit (the PIN is never returned again). The giver decides
 * whether the PIN goes on the card or in the envelope. With QR cards on the
 * event, the card can wear a design; the recipient, scan and giver lines are
 * editable, the PIN and email are not.
 */
export function useGiftCardPrint(eventId: string) {
    const t = useTranslations('GiftMode.card');
    const tCard = useTranslations('QrCardPage');
    const gift = useEventGift(eventId);
    const issued = useIssuedGiftCard(eventId);
    const templates = useQrCardTemplates(eventId);
    // Read on the client only: the server has no origin to put in the QR.
    const origin = useSyncExternalStore(
        subscribeToNothing,
        () => window.location.origin,
        () => null,
    );
    const [includePin, setIncludePin] = useState(true);

    const card = gift.data && canPrintGiftCard(gift.data) ? gift.data : null;
    // A PIN from before a reissue belongs to a dead card.
    const pin = card && issued.data?.token === card.token ? issued.data.pin : null;
    const showPin = Boolean(pin) && includePin;

    const designer = useQrCardDesigner({
        templates: templates.data?.templates ?? NO_TEMPLATES,
        defaults: { title: card?.recipientLabel ?? '', line: t('scan'), giver: card?.giverDisplayName ?? '' },
    });
    const exporter = useQrCardExport({ font: designer.style.headingFont, title: designer.text.title });

    const handleIncludePinChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setIncludePin(event.target.checked), []);
    const print = useCallback(() => window.print(), []);
    const { refetch } = templates;
    const retryTemplates = useCallback(() => void refetch(), [refetch]);

    return {
        isLoading: gift.isLoading || templates.isLoading,
        card,
        claimUrl: card?.token && origin ? giftClaimUrl(origin, card.token) : null,
        pin,
        includePin: showPin,
        handleIncludePinChange,
        print,
        designsAvailable: templates.data?.available === true,
        templatesFailed: templates.isError,
        retryTemplates,
        designer,
        exporter,
        cardLines: giftQrCardLines({
            line: designer.text.line,
            pin: showPin ? t('pin', { pin: pin ?? '' }) : null,
            email: card?.recipientEmail ? t('email', { email: card.recipientEmail }) : null,
            giver: designer.text.giver,
        }),
        cardLabel: tCard('cardLabel', { title: designer.text.title }),
    };
}
