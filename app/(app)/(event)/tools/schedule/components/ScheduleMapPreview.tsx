'use client';

import { buildGoogleMapsEmbedUrl } from '@/lib/maps';

interface ScheduleMapPreviewProps {
    mapsUrl: string;
    title: string;
}

export function ScheduleMapPreview({ mapsUrl, title }: ScheduleMapPreviewProps) {
    const embedUrl = buildGoogleMapsEmbedUrl(mapsUrl);
    if (!embedUrl) return null;

    return (
        <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative block overflow-hidden rounded-2xl border border-border/70 bg-surface-muted shadow-[0_10px_24px_rgba(35,28,22,0.08)]"
            aria-label={title}
        >
            <iframe
                title={title}
                src={embedUrl}
                className="h-44 w-full pointer-events-none"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="absolute inset-0 bg-linear-to-t from-ink/20 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-60" />
        </a>
    );
}
