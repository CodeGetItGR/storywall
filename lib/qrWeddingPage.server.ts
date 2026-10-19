import type { Locale } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { qrWeddingPageLive } from '@/lib/qrWeddingPage';

// Pass a locale where there is no request locale (the sitemap).
export async function loadQrWeddingPageLive(locale?: Locale): Promise<boolean> {
    try {
        return qrWeddingPageLive(await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get, locale));
    } catch {
        return qrWeddingPageLive(null);
    }
}
