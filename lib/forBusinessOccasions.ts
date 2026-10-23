import type { Locale } from '@/i18n/config';
import type { EventTypeConvention } from '@/lib/api/types';

// The occasions the partner page talks about. Adding one: an entry here, its
// copy under ForBusinessPage.occasions.<KEY> in each listed locale, an image in
// public/, and the keyword map in the spec. Only list an occasion once its event
// type is live in the app with a working demo in that language
// (docs/seo-guidelines.md, occasion pages).
export type ForBusinessOccasion = {
    eventTypeKey: EventTypeConvention;
    imageSrc: string;
    locales: readonly Locale[];
};

// List order is display order in every locale.
export const FOR_BUSINESS_OCCASIONS: readonly ForBusinessOccasion[] = [
    { eventTypeKey: 'WEDDING', imageSrc: '/landing/04-wedding-reception-santorini.webp', locales: ['en', 'el'] },
    { eventTypeKey: 'BAPTISM', imageSrc: '/landing/happy-baptism-celebration-outside-the-church-on-a-greek-island.webp', locales: ['en', 'el'] },
];

export function occasionsFor(locale: Locale): ForBusinessOccasion[] {
    return FOR_BUSINESS_OCCASIONS.filter((occasion) => occasion.locales.includes(locale));
}
