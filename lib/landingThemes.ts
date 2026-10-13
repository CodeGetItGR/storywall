import { endpoints } from '@/lib/api/endpoints';
import { serverPublicCachedGet } from '@/lib/api/serverFetch';
import type { EventTypeConvention, ThemePresetDto } from '@/lib/api/types';
import { resolveLocalizedText } from '@/lib/localizedText';

// How many presets a landing story row shows: one row of tiles on desktop.
export const LANDING_THEME_LIMIT = 6;

// Well under the presigned illustration URLs' one-hour lifetime, so a cached list never
// hands out an expired link.
const LANDING_THEMES_REVALIDATE_SECONDS = 300;

export type LandingTheme = {
    backgroundColor: string;
    id: string;
    illustrationUrl: string;
    name: string;
};

// Server-only: the first presets a host can pick for the event type, with names in the
// page locale. The endpoint is public and the same for everyone, so it's cached. Best-effort:
// a failed fetch returns [] and the row renders without its themes.
export async function getLandingThemes(eventType: EventTypeConvention, locale: string): Promise<LandingTheme[]> {
    try {
        const presets = await serverPublicCachedGet<ThemePresetDto[]>(
            endpoints.themePresets.byEventType(eventType),
            LANDING_THEMES_REVALIDATE_SECONDS,
        );
        return presets.slice(0, LANDING_THEME_LIMIT).map((preset) => ({
            backgroundColor: preset.backgroundColor,
            id: preset.id,
            illustrationUrl: preset.illustrationUrl,
            name: resolveLocalizedText(preset.name, locale),
        }));
    } catch {
        return [];
    }
}
