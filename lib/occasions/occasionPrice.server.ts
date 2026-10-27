import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { type OccasionPriceValues, occasionPriceValues } from '@/lib/occasions/occasionPrice';

// For metadata, which has no config in hand. The config fetch is cached (serverPublicConfigGet), so
// the page's own fetch reuses it. Config failed → no prices.
export async function loadOccasionPriceValues(eventType: EventTypeConvention): Promise<OccasionPriceValues> {
    try {
        return occasionPriceValues(await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get), eventType);
    } catch {
        return occasionPriceValues(null, eventType);
    }
}
