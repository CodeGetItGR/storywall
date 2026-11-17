'use client';

import { ReactNode } from 'react';

import { Logo } from '@/components/common/Logo';
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { useInviteHero } from '@/hooks/useInviteHero';
import type { EventThemeDto } from '@/lib/api/types';
import { themeFontScopeProps } from '@/lib/eventTheme';
import { cn } from '@/lib/utils';

interface InviteLayoutProps {
    // The event's cover. Without one (and without an illustration) the column shows the app logo.
    coverImageSrc?: string | null;
    coverImageAlt: string;
    // The event's theme. Its illustration takes the cover's place, as on the feed banner.
    theme?: EventThemeDto | null;
    eventTitle: string;
    eventSubtitle?: string | null;
    // The page's main buttons. On small screens they stay pinned to the bottom edge.
    actions?: ReactNode;
    // 'page' scrolls the hero away with the body, for long forms (the QR upload). By default the
    // hero stays put and only the body scrolls.
    scroll?: 'body' | 'page';
    // A slim bar instead of the hero (the QR page): the small logo at the left, this at the right.
    topBar?: ReactNode;
    // Under the slim bar, the event's name as a heading (the QR choices) or as a small grey line (the QR forms).
    barTitle?: 'heading' | 'line';
    // Shown at the foot of the body, after some space, with the footer logo right under it.
    bottom?: ReactNode;
    children: ReactNode;
}

export function InviteLayout({
    coverImageSrc,
    coverImageAlt,
    theme,
    eventTitle,
    eventSubtitle,
    actions,
    scroll = 'body',
    topBar,
    barTitle = 'heading',
    bottom,
    children,
}: InviteLayoutProps) {
    const hasBar = topBar !== undefined;
    const { hero, handleIllustrationError } = useInviteHero(hasBar ? null : theme, hasBar ? null : coverImageSrc);
    const heroKind = hasBar ? 'bar' : hero.kind;
    // The logo already shows at the top, so there's no footer logo under the body.
    const hasFooterLogo = heroKind !== 'logo' && heroKind !== 'bar';

    return (
        // One stacked column at every size: the hero on top, the actions below. Wider screens centre it.
        <div
            className={cn(
                'relative mx-auto flex h-full w-full max-w-xl flex-col bg-background md:px-6 md:pt-6',
                scroll === 'page' ? 'overflow-y-auto' : 'overflow-hidden',
            )}
        >
            {heroKind === 'bar' && (
                // Bar mode: the small logo and the bar's own control on one slim row, then the event's name.
                <div className="shrink-0 px-6 md:px-0">
                    {/* Top bar */}
                    <div className="flex h-14 items-center justify-between">
                        <Logo direction="row" className="gap-1.5" iconClassName="h-7 w-auto" wordmarkClassName="h-5 w-auto" />
                        {topBar}
                    </div>

                    {/* Title */}
                    {barTitle === 'heading' ? (
                        <div className="pt-3 text-center">
                            <h1 className="text-2xl font-bold text-balance text-ink md:text-3xl">{eventTitle}</h1>
                            {eventSubtitle && <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted md:text-base">{eventSubtitle}</p>}
                        </div>
                    ) : (
                        <h1 className="truncate pt-1 text-center text-xs font-medium text-ink-muted">{eventTitle}</h1>
                    )}
                </div>
            )}

            {heroKind === 'illustration' && hero.kind === 'illustration' && (
                // Illustration mode: the art sits clean on the theme colour and the title goes below it
                // in dark ink. The cover-photo overlay (dark gradient, white title) would only muddy it.
                <div
                    className="relative flex h-72 w-full shrink-0 flex-col bg-surface-muted md:h-96 md:overflow-hidden md:rounded-3xl"
                    style={hero.columnStyle}
                    {...themeFontScopeProps(hero.headingFont)}
                >
                    <ThemeFontFace font={hero.headingFont} />
                    <div className="relative m-4 min-h-0 flex-1 md:m-6">
                        <ProtectedImage
                            src={hero.src}
                            alt={eventTitle}
                            fill
                            sizes="(min-width: 768px) 576px, 100vw"
                            className="object-contain"
                            preload
                            loading="eager"
                            onError={handleIllustrationError}
                        />
                    </div>
                    <div className="px-6 pb-6 text-center">
                        <h1 className="event-heading text-2xl font-bold text-balance text-event-title md:text-3xl">{eventTitle}</h1>
                        {eventSubtitle && <p className="mx-auto mt-2 max-w-md text-sm text-ink md:text-base">{eventSubtitle}</p>}
                    </div>
                </div>
            )}

            {heroKind === 'cover' && hero.kind === 'cover' && (
                <div className="relative h-64 w-full shrink-0 bg-gradient-brand md:h-80 md:overflow-hidden md:rounded-3xl">
                    <ProtectedImage
                        src={hero.src}
                        alt={coverImageAlt}
                        fill
                        sizes="(min-width: 768px) 576px, 100vw"
                        className="object-cover"
                        preload
                        loading="eager"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute right-0 bottom-0 left-0 p-6">
                        <h1 className="text-2xl font-bold text-balance text-white md:text-3xl">{eventTitle}</h1>
                        {eventSubtitle && <p className="mt-2 max-w-md text-sm text-white/80 md:text-base">{eventSubtitle}</p>}
                    </div>
                </div>
            )}

            {heroKind === 'logo' && (
                // Logo mode: no illustration and no cover, so the app logo stands in, with the title below it.
                <div className="flex h-64 w-full shrink-0 flex-col items-center justify-center gap-6 bg-surface-muted px-6 text-center md:h-80 md:rounded-3xl">
                    <Logo direction="col" iconClassName="h-12 w-auto" wordmarkClassName="h-6 w-auto" />
                    <div>
                        <h1 className="text-2xl font-bold text-balance text-ink md:text-3xl">{eventTitle}</h1>
                        {eventSubtitle && <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted md:text-base">{eventSubtitle}</p>}
                    </div>
                </div>
            )}

            <div className={cn('flex flex-1 flex-col', scroll === 'body' && 'overflow-y-auto')}>
                {/* With no footer logo and no actions bar, the body keeps its own space at the bottom. */}
                <div
                    className={cn(
                        'mx-auto flex w-full max-w-sm flex-1 flex-col px-6',
                        heroKind !== 'bar' ? 'pt-8' : barTitle === 'line' ? 'pt-3' : 'pt-6',
                        !hasFooterLogo && !actions && 'pb-[max(2rem,env(safe-area-inset-bottom))]',
                    )}
                >
                    {/* Body */}
                    <div className="w-full">{children}</div>

                    {/* Actions */}
                    {actions && (
                        <div className="sticky bottom-0 -mx-6 mt-auto bg-background px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:mt-8 md:px-0 md:pt-0 md:pb-0">
                            {actions}
                        </div>
                    )}

                    {/* Bottom */}
                    {bottom && <div className="mt-auto pt-12">{bottom}</div>}

                    {/* Footer: the logo column or the top bar already shows it */}
                    {hasFooterLogo && (
                        <Logo
                            direction="row"
                            iconClassName="h-5 w-auto"
                            wordmarkClassName="h-3.5 w-auto"
                            className={cn('justify-center gap-2 pb-8 opacity-70', bottom ? 'pt-8' : actions ? 'pt-6 md:pt-10' : 'mt-auto pt-10')}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
