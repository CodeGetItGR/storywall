import { locales } from '@/i18n/config';
import { QR_WEDDING_PATHS } from '@/i18n/publicLocale';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { occasionPath, readyOccasions } from '@/lib/occasions/occasions';
import { routes } from '@/lib/routes';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// The id of the guide section, linked from the page header.
export const QR_WEDDING_GUIDE_ID = 'guide';

export const QR_WEDDING_CREATE_HREF = routes.events.new({ type: eventTypeSlug('WEDDING') });

// The page is about weddings alone: live while the WEDDING type is on. Unknown (config failed) → live.
// Off the production site until launch (lib/unreleasedPages.ts).
export function qrWeddingPageLive(config: AppConfigResponseDto | null): boolean {
    if (!showsUnreleasedPages()) return false;
    return !config || config.eventTypes.some((type) => type.eventTypeKey === 'WEDDING' && type.isEnabled);
}

// Until launch, the page's URLs were already indexed and shared, so they open the wedding page in the
// same language instead of a 404. Read by proxy.ts, which redirects temporarily (307): the page comes
// back at the same URL. Null for any other path, once the page is live, or with no wedding page.
export function qrWeddingRedirectPath(pathname: string): string | null {
    if (showsUnreleasedPages()) return null;
    const locale = locales.find((candidate) => QR_WEDDING_PATHS[candidate] === pathname);
    const wedding = readyOccasions().find((occasion) => occasion.eventType === 'WEDDING');
    return locale && wedding ? occasionPath(wedding, locale) : null;
}
