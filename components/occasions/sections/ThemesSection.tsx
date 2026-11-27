import { getTranslations } from 'next-intl/server';

import { ThemesView } from '@/components/occasions/sections/themes/ThemesView';
import { themesViewProps } from '@/components/occasions/sections/themes/themesViewProps';
import type { Locale } from '@/i18n/config';
import type { LandingTheme } from '@/lib/landingThemes';
import type { Occasion } from '@/lib/occasions/occasions';
import type { OccasionPageMedia } from '@/lib/occasions/pageMedia';

type ThemesSectionProps = { createHref: string; locale: Locale; media: OccasionPageMedia; occasion: Occasion; themes: LandingTheme[] };

export async function ThemesSection({ createHref, locale, media, occasion, themes }: ThemesSectionProps) {
    const copy = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.themes` });
    return <ThemesView {...themesViewProps({ copy, createHref, phone: media.themesPhone, themes })} />;
}
