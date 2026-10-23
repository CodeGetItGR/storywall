import type { Locale } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { liveOccasions, liveOccasionsInConfig, type Occasion } from '@/lib/occasions/occasions';

// The occasion pages that render right now: ready in code and enabled in /api/config.
// Pass a locale where there is no request locale (the sitemap).
export async function loadLiveOccasions(locale?: Locale): Promise<Occasion[]> {
    try {
        return liveOccasionsInConfig(await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get, locale));
    } catch {
        return liveOccasions(null);
    }
}
