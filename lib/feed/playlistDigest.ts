type TranslationFn = (key: string, values?: Record<string, string | number>) => string;

const PLAYLIST_DIGEST_COUNT_RE = /^🎵 (\d+) new songs were added to the playlist!$/;
const PLAYLIST_DIGEST_SINGLE_RE = /^🎵 "(.*?)" by (.*?) was just added to the playlist!$/;

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
        return t('playlistDigestSingle', { title: singleMatch[1], artist: singleMatch[2] });
    }

    return t('playlistDigest');
}
