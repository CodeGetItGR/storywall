type TranslationFn = (key: string, values?: Record<string, string | number>) => string;

const PLAYLIST_DIGEST_COUNT_RE = /^🎵 (\d+) new songs were added to the playlist!$/;
// The backend quotes "Title by Artist" (or just "Title" when there's no artist) as one label.
const PLAYLIST_DIGEST_SINGLE_RE = /^🎵 "(.*)" was just added to the playlist!$/;

export function formatPlaylistDigestContent(content: string | null, t: TranslationFn) {
    if (!content) {
        return t('playlistDigest');
    }

    const countMatch = content.match(PLAYLIST_DIGEST_COUNT_RE);
    if (countMatch) {
        return t('playlistDigestCount', { count: Number(countMatch[1]) });
    }

    const singleMatch = content.match(PLAYLIST_DIGEST_SINGLE_RE);
    if (singleMatch) {
        return t('playlistDigestSingle', { song: singleMatch[1] });
    }

    return t('playlistDigest');
}
