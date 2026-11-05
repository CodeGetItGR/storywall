// Every image and font file an old state points at. Each gets a stable id
// from its source, so running the converter again yields the same ids.

const SUPABASE_PUBLIC = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/([^?#]+)/;

export type MediaSource = {
    mediaId: string;
    // The file inside the old storage bucket, e.g. theme-assets/themes/1/a.png.
    storagePath?: string;
    // An image the old editor kept inline as a data: URL.
    dataUrl?: string;
    // Anything else (an outside link), kept as given.
    url?: string;
};

export class MediaCollector {
    private readonly byKey = new Map<string, MediaSource>();

    // Returns the media id for an old image URL, or undefined for an empty value.
    add(value: string): string | undefined {
        const url = value.trim();
        if (!url) return undefined;
        const source = describe(url);
        const key = source.storagePath ?? source.dataUrl ?? source.url ?? url;
        const existing = this.byKey.get(key);
        if (existing) return existing.mediaId;
        const mediaId = `smd-${stableHash(key)}`;
        this.byKey.set(key, { mediaId, ...source });
        return mediaId;
    }

    all(): MediaSource[] {
        return [...this.byKey.values()];
    }
}

function describe(url: string): Omit<MediaSource, 'mediaId'> {
    if (url.startsWith('data:')) return { dataUrl: url };
    const match = url.match(SUPABASE_PUBLIC);
    if (match) return { storagePath: decodeURIComponent(match[1]) };
    return { url };
}

// Two 32-bit FNV-1a passes with different seeds, as 16 hex characters: short,
// stable and plenty to keep a few thousand file names apart.
export function stableHash(text: string): string {
    const bytes = new TextEncoder().encode(text);
    return fnv1a(bytes, 0x811c9dc5) + fnv1a(bytes, 0x01000193 ^ 0x9e3779b9);
}

function fnv1a(bytes: Uint8Array, seed: number): string {
    let hash = seed >>> 0;
    for (const byte of bytes) {
        hash ^= byte;
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}
