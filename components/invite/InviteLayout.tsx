'use client';

import { CSSProperties, ReactNode, useState } from 'react';

import { Logo } from '@/components/common/Logo';
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import type { EventThemeDto } from '@/lib/api/types';
import { eventThemeStyle, themeFontScopeProps } from '@/lib/eventTheme';

interface InviteLayoutProps {
    coverImageSrc: string;
    coverImageAlt: string;
    // The event's theme. Its illustration takes the cover's place, as on the feed banner.
    theme?: EventThemeDto | null;
    eventTitle: string;
    eventSubtitle?: string | null;
    children: ReactNode;
}

export function InviteLayout({ coverImageSrc, coverImageAlt, theme, eventTitle, eventSubtitle, children }: InviteLayoutProps) {
    // An illustration that 404s (art replaced by an admin) falls back to the cover.
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const illustrationUrl = theme?.illustrationUrl && theme.illustrationUrl !== failedUrl ? theme.illustrationUrl : null;
    // The illustration column takes the theme colour and only the title colour and heading font tokens:
    // the event-page tokens (cards, pills, RSVP fill) mean nothing here. Nothing without a usable colour.
    const tokens = theme
        ? (eventThemeStyle(theme.backgroundColor, { titleColor: theme.titleColor, headingFont: theme.headingFont }) as
              Record<string, string> | undefined)
        : undefined;
    const columnStyle =
        tokens && theme
            ? ({
                  backgroundColor: theme.backgroundColor,
                  '--event-title': tokens['--event-title'],
                  '--event-heading-font': tokens['--event-heading-font'],
              } as CSSProperties)
            : undefined;
    const headingFont = columnStyle ? theme?.headingFont : null;

    function handleIllustrationError() {
        setFailedUrl(theme?.illustrationUrl ?? null);
    }

    return (
        <div className="flex h-full flex-col overflow-hidden bg-background lg:flex-row">
            {illustrationUrl ? (
                // Illustration mode: the art sits clean on the theme colour and the title goes below it
                // in dark ink. The cover-photo overlay (dark gradient, white title) would only muddy it.
                <div
                    className="relative flex h-72 w-full shrink-0 flex-col bg-surface-muted md:h-130 lg:h-full lg:w-1/2"
                    style={columnStyle}
                    {...themeFontScopeProps(headingFont)}
                >
                    <ThemeFontFace font={headingFont} />
                    <div className="relative m-4 min-h-0 flex-1 lg:m-12">
                        <ProtectedImage
                            src={illustrationUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 50vw, 100vw"
                            className="object-contain"
                            preload
                            loading="eager"
                            onError={handleIllustrationError}
                        />
                    </div>
                    <div className="px-6 pb-6 text-center lg:px-12 lg:pb-12 xl:px-16 xl:pb-16">
                        <h1 className="event-heading text-2xl font-bold text-balance text-event-title lg:text-4xl xl:text-5xl">{eventTitle}</h1>
                        {eventSubtitle && <p className="mx-auto mt-2 max-w-md text-sm text-ink lg:text-base">{eventSubtitle}</p>}
                    </div>
                </div>
            ) : (
                <div className="relative h-64 w-full shrink-0 bg-gradient-brand md:h-130 lg:h-full lg:w-1/2">
                    <ProtectedImage
                        src={coverImageSrc}
                        alt={coverImageAlt}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover"
                        preload
                        loading="eager"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute right-0 bottom-0 left-0 p-6 lg:p-12 xl:p-16">
                        <h1 className="text-2xl font-bold text-balance text-white lg:text-4xl xl:text-5xl">{eventTitle}</h1>
                        {eventSubtitle && <p className="mt-2 max-w-md text-sm text-white/80 lg:text-base">{eventSubtitle}</p>}
                    </div>
                </div>
            )}

            <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-8 lg:w-1/2 lg:p-12">
                <div className="flex w-full max-w-sm flex-col items-center lg:max-w-md">
                    <Logo direction="col" iconClassName="h-7 w-auto" wordmarkClassName="h-5 w-auto" className="mb-6" />
                    <div className="w-full">{children}</div>
                </div>
            </div>
        </div>
    );
}
