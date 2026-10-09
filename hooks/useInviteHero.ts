import { CSSProperties, useState } from 'react';

import type { EventThemeDto } from '@/lib/api/types';
import { eventThemeStyle } from '@/lib/eventTheme';

export type InviteHero =
    | { kind: 'illustration'; src: string; columnStyle: CSSProperties | undefined; headingFont: EventThemeDto['headingFont'] | null }
    | { kind: 'cover'; src: string }
    | { kind: 'logo' };

// What the invite column shows: the theme's illustration, then the event's cover, then the app logo.
export function useInviteHero(theme: EventThemeDto | null | undefined, coverImageSrc: string | null | undefined) {
    // An illustration that 404s (art replaced by an admin) falls back to the cover.
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const illustrationUrl = theme?.illustrationUrl && theme.illustrationUrl !== failedUrl ? theme.illustrationUrl : null;

    function handleIllustrationError() {
        setFailedUrl(theme?.illustrationUrl ?? null);
    }

    let hero: InviteHero;
    if (illustrationUrl && theme) {
        // The illustration column takes the theme colour and only the title colour and heading font tokens:
        // the event-page tokens (cards, pills, RSVP fill) mean nothing here. Nothing without a usable colour.
        const tokens = eventThemeStyle(theme.backgroundColor, { titleColor: theme.titleColor, headingFont: theme.headingFont }) as
            Record<string, string> | undefined;
        const columnStyle = tokens
            ? ({
                  backgroundColor: theme.backgroundColor,
                  '--event-title': tokens['--event-title'],
                  '--event-heading-font': tokens['--event-heading-font'],
              } as CSSProperties)
            : undefined;
        hero = { kind: 'illustration', src: illustrationUrl, columnStyle, headingFont: columnStyle ? theme.headingFont : null };
    } else if (coverImageSrc) {
        hero = { kind: 'cover', src: coverImageSrc };
    } else {
        hero = { kind: 'logo' };
    }

    return { hero, handleIllustrationError };
}
