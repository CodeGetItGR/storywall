import type { EventTypeConvention } from '@/lib/api/types';
import { BAPTISM_PAGE_MEDIA, type OccasionPageMedia, WEDDING_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

// How a redesigned occasion page differs from the others.
export type OccasionPageConfig = {
    media: OccasionPageMedia;
    // The hero's demo button, the band to the demo and the demo section. Also needs eventType.hasDemo.
    demo: boolean;
    // Links to the QR wedding page (hero, why, FAQ). Also needs the QR page to be live.
    qrLinks: boolean;
    // The Themes section, with the hero and the band pointing to it. Also needs plans that offer themes.
    themes: boolean;
    // The guests' photos: sliding past, or three standing still.
    guestPhotos: 'marquee' | 'row';
};

const PAGE_CONFIGS: Partial<Record<EventTypeConvention, OccasionPageConfig>> = {
    WEDDING: { media: WEDDING_PAGE_MEDIA, demo: true, qrLinks: true, themes: false, guestPhotos: 'marquee' },
    BAPTISM: { media: BAPTISM_PAGE_MEDIA, demo: false, qrLinks: false, themes: true, guestPhotos: 'row' },
};

// null → the occasion is still on the old generic layout (OccasionContent, removed in KAN-254).
export function occasionPageConfig(eventType: EventTypeConvention): OccasionPageConfig | null {
    return PAGE_CONFIGS[eventType] ?? null;
}
