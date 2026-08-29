import { routes } from '@/lib/routes';

export const COVER_PHOTO_SECTION_ID = 'cover-photo';
export const GIFT_ACCOUNT_SECTION_ID = 'gift-account';

export function coverPhotoSettingsHref(eventId: string): string {
    return routes.events.manage(eventId, { tab: 'settings', section: COVER_PHOTO_SECTION_ID });
}

export function giftAccountSetupHref(eventId: string): string {
    return routes.events.manage(eventId, { tab: 'overview', section: GIFT_ACCOUNT_SECTION_ID });
}
