import { endpoints } from '@/lib/api/endpoints';
import { PUBLIC_CONFIG_REVALIDATE_SECONDS, serverPublicCachedGet } from '@/lib/api/serverFetch';
import type { EventTypeConvention, ThemePresetDto } from '@/lib/api/types';

// Best-effort: null hides the themes row. Cached like the public config, since every
// visitor gets the same presets and all server fetches share one rate-limit budget.
export async function loadOccasionThemePresets(eventType: EventTypeConvention): Promise<ThemePresetDto[] | null> {
    try {
        const presets = await serverPublicCachedGet<ThemePresetDto[]>(endpoints.themePresets.byEventType(eventType), PUBLIC_CONFIG_REVALIDATE_SECONDS);
        return presets.length > 0 ? presets : null;
    } catch {
        return null;
    }
}
