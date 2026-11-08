import { combineTones, type PhotoTone, photoToneFromPixels } from '@/lib/invitation/photoContrast';

// Photos measured in this browser, kept for the whole visit so a section that
// re-renders (the editor, a second preview) gets its tint at once.
// null means the photo could not be measured, e.g. its server sends no CORS headers.

// Small enough to be quick, big enough to see a bright sky or a dark tree line.
const SAMPLE_SIZE = 32;

export type MeasurePhoto = (url: string) => Promise<PhotoTone | undefined>;

const tones = new Map<string, PhotoTone | null>();
const combined = new Map<string, PhotoTone | null>();
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

// Decoding straight to sample size is much quicker for a large photo.
async function measureAsBitmap(url: string): Promise<PhotoTone | undefined> {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`Photo answered ${response.status}`);
    const bitmap = await createImageBitmap(await response.blob(), { resizeWidth: SAMPLE_SIZE, resizeHeight: SAMPLE_SIZE, resizeQuality: 'low' });
    try {
        return sampleTone(bitmap);
    } finally {
        bitmap.close();
    }
}

// Browsers can't make a bitmap from an SVG, so those go through an <img>.
async function measureAsImage(url: string): Promise<PhotoTone | undefined> {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return sampleTone(image);
}

export async function measurePhoto(url: string): Promise<PhotoTone | undefined> {
    try {
        return await measureAsBitmap(url);
    } catch {
        try {
            return await measureAsImage(url);
        } catch {
            return undefined;
        }
    }
}

function photosKey(urls: readonly string[]): string {
    return urls.join('\n');
}

// The tone of all the photos together: undefined while any is still being
// measured, null when any could not be.
export function readPhotoTone(urls: readonly string[]): PhotoTone | null | undefined {
    const key = photosKey(urls);
    if (combined.has(key)) return combined.get(key);
    const measured = urls.map((url) => tones.get(url));
    if (measured.some((tone) => tone === undefined)) return undefined;
    const tone = measured.includes(null) ? null : (combineTones(measured as PhotoTone[]) ?? null);
    combined.set(key, tone);
    return tone;
}

export function subscribePhotoTones(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function requestPhotoTones(urls: readonly string[], measure: MeasurePhoto = measurePhoto): void {
    for (const url of urls) {
        if (tones.has(url) || pending.has(url)) continue;
        pending.add(url);
        void measure(url).then((tone) => {
            pending.delete(url);
            tones.set(url, tone ?? null);
            listeners.forEach((listener) => listener());
        });
    }
}

// Tests start from an empty store.
export function resetPhotoTones(): void {
    tones.clear();
    combined.clear();
    pending.clear();
}
