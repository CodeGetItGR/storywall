'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { QrCardWordingKey } from '@/lib/api/types';
import { QR_CARD_WORDING_KEYS } from '@/lib/qrCardLayout';

type Catalog = { QrCardPage: { lines: Record<string, string> }; GiftMode: { card: { scan: string } } };

function wordingOf(lines: (key: string) => string, gift: string): Record<QrCardWordingKey, string> {
    return Object.fromEntries(QR_CARD_WORDING_KEYS.map((key) => [key, key === 'gift' ? gift : lines(key)])) as Record<QrCardWordingKey, string>;
}

// The app's own scan lines in English and Greek, which a design's empty wording falls back to. The page only
// has its own language's messages, so the other one's catalog loads on first use; until then it's blank.
export function useQrCardStandardWording(): Record<'en' | 'el', Record<QrCardWordingKey, string>> {
    const locale = useLocale();
    const tLines = useTranslations('QrCardPage.lines');
    const tGift = useTranslations('GiftMode.card');
    const other = locale === 'el' ? 'en' : 'el';
    const otherCatalog = useQuery({
        queryKey: ['qrCardStandardWording', other],
        queryFn: async (): Promise<Catalog> =>
            (other === 'el' ? await import('@/messages/el.json') : await import('@/messages/en.json')).default as Catalog,
        staleTime: Infinity,
        gcTime: Infinity,
    });

    return useMemo(() => {
        const own = wordingOf((key) => tLines(key), tGift('scan'));
        const catalog = otherCatalog.data;
        const blank = wordingOf(() => '', '');
        const theirs = catalog ? wordingOf((key) => catalog.QrCardPage.lines[key] ?? '', catalog.GiftMode.card.scan) : blank;
        return other === 'el' ? { en: own, el: theirs } : { en: theirs, el: own };
    }, [other, otherCatalog.data, tGift, tLines]);
}
