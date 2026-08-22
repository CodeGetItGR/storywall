'use client';

import { buildGoogleMapsEmbedUrl } from '@/lib/maps';
import { cn } from '@/lib/utils';

interface ScheduleMapPreviewProps {
    mapsUrl: string;
    title: string;
    openLabel: string;
    previewLabel: string;
    unavailableLabel: string;
}

export function ScheduleMapPreview({ mapsUrl, title, openLabel, previewLabel, unavailableLabel }: ScheduleMapPreviewProps) {
    const embedUrl = buildGoogleMapsEmbedUrl(mapsUrl);

    if (!embedUrl) {
        return (
            <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={title}
                className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-surface-muted px-4 py-5 text-center transition-colors hover:bg-surface-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
                <div className="max-w-[14rem]">
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{unavailableLabel}</p>
                </div>
                <span className="rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold text-ink shadow-sm">{openLabel}</span>
            </a>
        );
    }

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-surface-muted shadow-[0_10px_24px_rgba(35,28,22,0.08)]">
            <iframe title={title} src={embedUrl} className="h-44 w-full pointer-events-none" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />

            <div className="absolute inset-0 bg-linear-to-t from-ink/20 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-60" />
            <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                    'absolute inset-0 z-10 flex items-end justify-between p-3',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset'
                )}
                aria-label={title}
            >
                <span className="rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur-sm">
                    {openLabel}
                </span>
                <span className="rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint shadow-sm backdrop-blur-sm">
                    {previewLabel}
                </span>
            </a>
        </div>
    );
}
