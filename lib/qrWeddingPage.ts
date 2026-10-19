import type { AppConfigResponseDto } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { routes } from '@/lib/routes';

// The id of the guide section, linked from the page header.
export const QR_WEDDING_GUIDE_ID = 'guide';

export const QR_WEDDING_CREATE_HREF = routes.events.new({ type: eventTypeSlug('WEDDING') });

// The page is about weddings alone: live while the WEDDING type is on. Unknown (config failed) → live.
export function qrWeddingPageLive(config: AppConfigResponseDto | null): boolean {
    return !config || config.eventTypes.some((type) => type.eventTypeKey === 'WEDDING' && type.isEnabled);
}
