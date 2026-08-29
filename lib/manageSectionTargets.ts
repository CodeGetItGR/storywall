import { routes } from '@/lib/routes';

export const COVER_PHOTO_SECTION_ID = 'cover-photo';

export function coverPhotoSettingsHref(eventId: string): string {
    return routes.events.manage(eventId, { tab: 'settings', section: COVER_PHOTO_SECTION_ID });
}
