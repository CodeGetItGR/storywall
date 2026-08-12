export function buildSpotifyEmbedUrl(url: string | null): string | null {
    if (!url) return null;

    try {
        const parsed = new URL(url);
        if (!parsed.hostname.includes('spotify.com')) return null;

        const parts = parsed.pathname.split('/').filter(Boolean);
        const trackIndex = parts.indexOf('track');
        const trackId = trackIndex >= 0 ? parts[trackIndex + 1] : parts[parts.length - 1];
        return trackId ? `https://open.spotify.com/embed/track/${trackId}` : null;
    } catch {
        return null;
    }
}

export function buildYouTubeEmbedUrl(url: string | null): string | null {
    if (!url) return null;

    try {
        const parsed = new URL(url);
        let videoId: string | null = null;

        if (parsed.hostname.includes('youtu.be')) {
            videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
        } else if (parsed.hostname.includes('youtube.com')) {
            videoId = parsed.searchParams.get('v');
            if (!videoId) {
                const parts = parsed.pathname.split('/').filter(Boolean);
                const embedIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts');
                videoId = embedIndex >= 0 ? (parts[embedIndex + 1] ?? null) : null;
            }
        }

        return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    } catch {
        return null;
    }
}
