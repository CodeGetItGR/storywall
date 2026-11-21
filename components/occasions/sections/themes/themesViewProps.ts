import type { ThemesViewProps } from '@/components/occasions/sections/themes/ThemesView';
import type { LandingTheme } from '@/lib/landingThemes';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';
import type { PageTranslator } from '@/lib/occasions/pageCopy';

type ThemesViewPropsInput = {
    // OccasionPages.<type>.themes
    copy: PageTranslator;
    createHref: string;
    phone: OccasionPhoto | null;
    themes: LandingTheme[];
};

export function themesViewProps({ copy, createHref, phone, themes }: ThemesViewPropsInput): ThemesViewProps {
    return {
        cta: { href: createHref, label: copy('cta') },
        heading: copy.raw('heading') as [string, string],
        kicker: copy('kicker'),
        lead: copy('lead'),
        phone: phone ? { alt: copy('phoneAlt'), caption: copy('phoneCaption'), photo: phone } : null,
        tiles: themes.map((theme) => ({ alt: copy('tileAlt', { name: theme.name }), theme })),
    };
}
