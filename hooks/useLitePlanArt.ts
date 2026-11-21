import { BookHeart, Images } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { SubTabItem } from '@/components/ui/SubTabs';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useQrCardFeatureTexts } from '@/hooks/useQrCardFeatureTexts';
import type { EventTypeConvention, ModuleKey } from '@/lib/api/types';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { PLAIN_FEATURES_QR_CARD_STYLE, QR_CARD_INK, type QrCardStyle } from '@/lib/qrCard';
import { qrCardFeatures } from '@/lib/qrCardFeatures';

// What a lite plan gives the host: photos through a QR card, a wishbook, or both.
export type LitePlanArtKind = 'gallery' | 'wishbook' | 'both';

// A sample link: the drawing's QR code only has to look real.
const SAMPLE_URL = 'https://storywall.gr/q/7Hk2pQx9Lm';

const LINE_KEY = { gallery: 'gallery', wishbook: 'guestWish', both: 'guestBoth' } as const;

const MODULES = { gallery: ['gallery'], wishbook: ['wishbook'], both: ['gallery', 'wishbook'] } as const;

// The gallery's photos by event type, and the two floating beside the phone. Weddings and baptisms have their own;
// every other type gets a mix of celebrations. Baptisms reuse their three photos, as the baptism page does.
const BAPTISM_CHURCH = '/landing/baptism-ceremony-inside-the-church.webp';
const BAPTISM_TABLE = '/landing/baptism-celebration-at-the-table.webp';
const BAPTISM_OUTSIDE = '/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.webp';
const SUNSET = '/landing/friends-and-family-celebrating-at-sunset.webp';
const DANCING = '/landing/guests-dancing-at-an-elegant-vip-social-party-at-night.webp';
const WEDDING = {
    photos: [
        '/landing/wedding/wedding-marquee-10-first-dance.webp',
        '/landing/wedding/wedding-marquee-03-taverna-toast.webp',
        '/landing/wedding/wedding-marquee-09-tender-moment.webp',
        '/landing/wedding/wedding-marquee-11-reception-dance.webp',
        '/landing/wedding/wedding-marquee-07-guests-at-church.webp',
        '/landing/wedding/wedding-marquee-05-groom-friends.webp',
    ],
    floating: [SUNSET, DANCING],
} as const;
const BAPTISM = {
    photos: [BAPTISM_CHURCH, BAPTISM_TABLE, BAPTISM_OUTSIDE, BAPTISM_TABLE, BAPTISM_CHURCH, BAPTISM_OUTSIDE],
    floating: [BAPTISM_TABLE, BAPTISM_CHURCH],
} as const;
const CELEBRATION = [
    '/landing/guests-mingling-with-champagne-at-an-elegant-vip-social-party.webp',
    '/landing/stylish-guests-dancing-at-an-elegant-vip-social-party-at-night.webp',
    '/landing/woman-in-black-dress-holding-birthday-cake.webp',
    '/landing/close-up-selfie-of-stylish-guests-and-influencers-celebrating-at.webp',
    '/landing/guests-mingling-with-champagne-at-an-elegant-formal-vip-social-e.webp',
    SUNSET,
    DANCING,
] as const;

// The event's cover (the wizard's photo for its type), the gallery's photos and the two floating ones.
function eventPhotos(eventType: EventTypeConvention) {
    const cover = createEventTypePhoto(eventType, null);
    if (eventType === 'WEDDING') return { cover, ...WEDDING };
    if (eventType === 'BAPTISM') return { cover, ...BAPTISM };
    // Six for the gallery and two to float, leaving out the type's own cover.
    const set = CELEBRATION.filter((src) => src !== cover);
    return { cover, photos: set.slice(0, 6), floating: [set.at(-2) ?? SUNSET, set.at(-1) ?? DANCING] as const };
}

// A fixed date for the wishes, so the drawing never changes.
const WISH_DATE = '2026-06-20T22:40:00';

export type LiteWish = { author: string; message?: string; voiceMs?: number };

// A filled-in card: the plain look with a date, the place and a note, and the logo at the bottom.
type CardField = 'date' | 'place' | 'description';
function cardField(id: CardField, y: number, height: number, textSize: number, bold = false) {
    return { id, kind: 'host' as const, x: 8, y, width: 89, height, textSize, align: 'center' as const, font: 'body' as const, bold, color: QR_CARD_INK, text: null, label: null, placeholder: null };
}
const CARD_STYLE: QrCardStyle = {
    ...PLAIN_FEATURES_QR_CARD_STYLE,
    layout: {
        title: { x: 8, y: 8, width: 89, height: 9, maxSize: 7.5, align: 'center' },
        code: { x: 32.5, y: 23, size: 40, panel: true, radius: 4 },
        lines: { x: 8, y: 64, width: 89, height: 6, textSize: 4.2, align: 'center' },
        fields: [cardField('date', 17.5, 4.5, 3.6), cardField('place', 112, 5, 3.8, true), cardField('description', 117.5, 5, 3.4)],
        features: { x: 8, y: 71, width: 89, height: 38 },
        logo: { x: 41.5, y: 132, width: 22, color: null },
    },
};

// The lite plan's kind from its modules. Null for a plan with neither.
export function litePlanArtKind(moduleKeys: readonly ModuleKey[] | undefined): LitePlanArtKind | null {
    const gallery = moduleKeys?.includes('gallery') ?? false;
    const wishbook = moduleKeys?.includes('wishbook') ?? false;
    if (gallery && wishbook) return 'both';
    if (gallery) return 'gallery';
    if (wishbook) return 'wishbook';
    return null;
}

// The QR card guests scan for this plan, with the host's title on it, and the page the scan opens.
export function useLitePlanArt(kind: LitePlanArtKind, title: string, eventType: EventTypeConvention | null = null) {
    const t = useTranslations('QrCardPage');
    const tQr = useTranslations('QrCodePage.preview');
    const moduleCopy = useModuleCopy(eventType);
    const galleryName = moduleCopy('gallery').name;
    const wishbookName = moduleCopy('wishbook').name;
    const featureTexts = useQrCardFeatureTexts();
    const firstAuthor = tQr('wishAuthor');
    const firstMessage = tQr('wishText');
    const tArt = useTranslations('CreateEventPage.wizard.details.liteArt');
    const sofia = tQr('story3');
    const giorgos = tQr('story4');
    const nikos = tQr('story2');
    const maria = tQr('postAuthor');
    const sofiaMessage = tArt('wishSofia');
    const giorgosMessage = tArt('wishGiorgos');
    const cardDate = tArt('cardDate');
    const cardPlace = tArt('cardPlace');
    const cardDescription = tArt('cardDescription');

    return useMemo(() => {
        const features = qrCardFeatures(MODULES[kind].map((moduleKey) => ({ moduleKey, isAvailable: true })));
        return {
            hasGallery: kind !== 'wishbook',
            hasWishbook: kind !== 'gallery',
            // The wishbook as the host reads it: written wishes and voice wishes.
            wishes: [
                { author: firstAuthor, message: firstMessage },
                { author: giorgos, message: giorgosMessage },
                { author: sofia, message: sofiaMessage },
                { author: nikos, voiceMs: 58_000 },
                // Only on a wide banner (the full page on desktop).
                { author: maria, voiceMs: 42_000 },
            ] satisfies LiteWish[],
            wishDate: WISH_DATE,
            ...eventPhotos(eventType ?? 'WEDDING'),
            tabs: [
                { key: 'gallery', label: galleryName, icon: Images },
                { key: 'wishbook', label: wishbookName, icon: BookHeart },
            ] satisfies SubTabItem<'gallery' | 'wishbook'>[],
            card: {
                style: CARD_STYLE,
                fields: { date: cardDate, place: cardPlace, description: cardDescription } satisfies Record<CardField, string>,
                url: SAMPLE_URL,
                title,
                lines: [{ text: t(`lines.${LINE_KEY[kind]}`), tone: 'body' as const }],
                label: t('cardLabel', { title }),
                features,
                featureTexts,
            },
        };
    }, [kind, title, eventType, t, featureTexts, firstAuthor, firstMessage, sofia, giorgos, nikos, maria, sofiaMessage, giorgosMessage, cardDate, cardPlace, cardDescription, galleryName, wishbookName]);
}
