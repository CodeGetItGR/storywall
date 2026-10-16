import type { EventTypeConvention } from '@/lib/api/types';
import { isWithinWindow } from '@/lib/occasions/campaigns';

// Each id has a [data-occasion-theme="<id>"] token set in components/landing/landing.css.
export const OCCASION_THEME_IDS = ['winter'] as const;
export type OccasionThemeId = (typeof OCCASION_THEME_IDS)[number];

export type OccasionTheme = {
    id: OccasionThemeId;
    // Omitted → every occasion.
    occasions?: readonly EventTypeConvention[];
    startsAt: string;
    endsAt: string;
};

export const OCCASION_THEMES: readonly OccasionTheme[] = [];

export function activeTheme(eventType: EventTypeConvention, now: Date, themes: readonly OccasionTheme[] = OCCASION_THEMES): OccasionThemeId | null {
    return (
        themes
            .filter((theme) => (!theme.occasions || theme.occasions.includes(eventType)) && isWithinWindow(theme, now))
            .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0]?.id ?? null
    );
}
