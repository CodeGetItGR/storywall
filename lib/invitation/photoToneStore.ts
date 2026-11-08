import { type PhotoTone, photoToneFromPixels } from '@/lib/invitation/photoContrast';

// Photos measured in this browser, kept for the whole visit so a section that
// re-renders (the editor, a second preview) gets its tint at once.
// null means the photo could not be measured, e.g. its server sends no CORS headers.

// Small enough to be quick, big enough to see a bright sky or a dark tree line.
const SAMPLE_SIZE = 32;

export type MeasurePhoto = (url: string) => Promise<PhotoTone | undefined>;

const tones = new Map<string, PhotoTone | null>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

// Draws a photo at sample size and reads its pixels.
function sampleTone(source: CanvasImageSource): PhotoTone | undefined {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return undefined;
    context.drawImage(source, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    return photoToneFromPixels(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
}

// Browsers can't make a bitmap from an SVG, so those are drawn through an
// <img> of the file already downloaded, which needs no second request.
async function sampleSvg(blob: Blob): Promise<PhotoTone | undefined> {
    const url = URL.createObjectURL(blob);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        return sampleTone(image);
    } finally {
        URL.revokeObjectURL(url);
    }
}

// One request per photo: a server that refuses it (no CORS headers) leaves
// the photo unmeasured rather than being asked again another way.
export async function measurePhoto(url: string): Promise<PhotoTone | undefined> {
    try {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) return undefined;
        const blob = await response.blob();
        if (blob.type.includes('svg')) return await sampleSvg(blob);
        // Decoding straight to sample size is much quicker for a large photo.
        const bitmap = await createImageBitmap(blob, { resizeWidth: SAMPLE_SIZE, resizeHeight: SAMPLE_SIZE, resizeQuality: 'low' });
        try {
            return sampleTone(bitmap);
        } finally {
            bitmap.close();
        }
    } catch {
        return undefined;
    }
}

// undefined while the photo is being measured or not asked for yet, null when
// it could not be.
export function readPhotoTone(url: string): PhotoTone | null | undefined {
    return tones.get(url);
}

export function subscribePhotoTones(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function requestPhotoTone(url: string, measure: MeasurePhoto = measurePhoto): void {
    if (tones.has(url) || pending.has(url)) return;
    pending.add(url);
    void measure(url).then((tone) => {
        pending.delete(url);
        tones.set(url, tone ?? null);
        listeners.forEach((listener) => listener());
    });
}

// Tests start from an empty store.
export function resetPhotoTones(): void {
    tones.clear();
    pending.clear();
}
