'use client';

import { useTranslations } from 'next-intl';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { Banner } from '@/components/feed/Banner';
import type { EventThemeFontDto } from '@/lib/api/types';
import { eventThemeStyle, themeFontScopeProps } from '@/lib/eventTheme';

// The event home with this preset applied: the colour behind the page, the illustration in the
// cover's place and the title in the theme's colour and heading font, drawn by the same Banner and
// event tokens. Before an illustration is chosen its place stays empty, so the title still shows as
// a themed event draws it rather than in the cover-photo overlay's white.
export function ThemePresetPreview({
    backgroundColor,
    illustrationUrl,
    title,
    titleColor,
    headingFont,
}: {
    backgroundColor: string | null;
    illustrationUrl: string | null;
    title: string;
    titleColor: string | null;
    headingFont: EventThemeFontDto | null;
}) {
    const t = useTranslations('AdminPage.themePresets.preview');

    return (
        <figure>
            <ThemeFontFace font={headingFont} />
            {/* Caption */}
            <figcaption className="mb-2 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('label')}</figcaption>
            {/* Event home */}
            <div
                data-testid="theme-preview-surface"
                className="mx-auto w-full max-w-90 overflow-hidden rounded-2xl border border-border bg-event pt-3 pb-4"
                style={eventThemeStyle(backgroundColor, { titleColor, headingFont })}
                {...themeFontScopeProps(headingFont)}
            >
                {illustrationUrl ? (
                    <Banner image={null} illustrationUrl={illustrationUrl} title={title} glowVisible={false} />
                ) : (
                    <div className="relative w-full px-2">
                        <div className="aspect-16/11 w-full rounded-[1.5rem] border border-dashed border-event-card-line" aria-hidden="true" />
                        <h1 className="event-heading px-5 pt-3 text-center alegreya-light text-2xl text-event-title">{title}</h1>
                    </div>
                )}
                {/* Sample posts */}
                <div className="mt-3 space-y-2 px-2" aria-hidden="true">
                    <div data-testid="theme-preview-post" className="h-14 rounded-2xl border-b border-event-card-line bg-event-card" />
                    <div data-testid="theme-preview-post" className="h-14 rounded-2xl border-b border-event-card-line bg-event-card" />
                </div>
            </div>
        </figure>
    );
}
