'use client';

import { useTranslations } from 'next-intl';

import { Banner } from '@/components/feed/Banner';
import { eventThemeStyle } from '@/lib/eventTheme';

// The event home with this preset applied: the colour behind the page and the
// illustration in the cover's place, drawn by the same Banner and bg-event token.
export function ThemePresetPreview({
    backgroundColor,
    illustrationUrl,
    title,
}: {
    backgroundColor: string | null;
    illustrationUrl: string | null;
    title: string;
}) {
    const t = useTranslations('AdminPage.themePresets.preview');

    return (
        <figure>
            {/* Caption */}
            <figcaption className="mb-2 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('label')}</figcaption>
            {/* Event home */}
            <div
                data-testid="theme-preview-surface"
                className="mx-auto w-full max-w-90 overflow-hidden rounded-2xl border border-border bg-event pt-3 pb-4"
                style={eventThemeStyle(backgroundColor)}
            >
                <Banner image={null} illustrationUrl={illustrationUrl} title={title} glowVisible={false} />
                {/* Sample posts */}
                <div className="mt-3 space-y-2 px-2" aria-hidden="true">
                    <div className="h-14 rounded-2xl bg-card" />
                    <div className="h-14 rounded-2xl bg-card" />
                </div>
            </div>
        </figure>
    );
}
