import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { buildGoogleMapsEmbedUrl, isGoogleMapsShortLink } from '@/lib/maps';

export const mapsKeys = {
    resolve: (url: string) => ['maps', 'resolve', url] as const,
};

async function resolveShortLink(url: string): Promise<string | null> {
    const res = await fetch(`/api/maps/resolve?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { resolvedUrl: string } | null;
    return body?.resolvedUrl ?? null;
}

// Embeddable map URL for a Maps link. Short share links are resolved on the
// server first; full links are handled directly.
export function useMapsEmbedUrl(mapsUrl: string) {
    const locale = useLocale();
    const isShortLink = isGoogleMapsShortLink(mapsUrl);

    const resolved = useQuery({
        queryKey: mapsKeys.resolve(mapsUrl),
        queryFn: () => resolveShortLink(mapsUrl),
        enabled: isShortLink,
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
    });

    const sourceUrl = isShortLink ? (resolved.data ?? null) : mapsUrl;

    return {
        embedUrl: buildGoogleMapsEmbedUrl(sourceUrl, locale),
        isResolving: isShortLink && resolved.isPending,
    };
}
