export function buildGoogleMapsEmbedUrl(url: string | null): string | null {
    if (!url) return null;

    try {
        const parsed = new URL(url);
        if (!parsed.hostname.includes('google.')) return null;

        const embed = new URL('https://www.google.com/maps');
        embed.pathname = parsed.pathname;
        embed.hash = parsed.hash;
        for (const [key, value] of parsed.searchParams.entries()) {
            embed.searchParams.set(key, value);
        }

        if (!embed.searchParams.has('output')) embed.searchParams.set('output', 'embed');
        if (!embed.searchParams.has('z')) embed.searchParams.set('z', '15');
        if (!embed.searchParams.has('hl')) embed.searchParams.set('hl', 'en');

        return embed.toString();
    } catch {
        return null;
    }
}
