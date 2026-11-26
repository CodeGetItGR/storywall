import { type FramedDesign, frameSvg, frameSvgDataUrl, type FrameText } from '@/lib/uploadFrame';

// Phone cameras produce 4–10 MB photos, and the server downscales every image to
// `media.maxImageDimension` (2560 px) anyway. On a venue's mobile connection the extra pixels were
// most of a 25-second upload, so photos are shrunk to that long edge here, before they're sent.
// Anything that can't be shrunk safely is sent as it was: the server still handles it.

// Types a canvas re-encodes as themselves. GIF is left out: a canvas keeps only its first frame.
const SHRINKABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// High, because the server encodes the photo again.
const ENCODE_QUALITY = 0.9;

export async function shrinkImageForUpload(file: File, maxDimension: number): Promise<File> {
    if (!SHRINKABLE_TYPES.has(file.type) || !(maxDimension > 0)) return file;
    let bitmap: ImageBitmap | null = null;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const scale = maxDimension / Math.max(bitmap.width, bitmap.height);
        if (scale >= 1) return file;

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d');
        if (!context) return file;
        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, ENCODE_QUALITY));
        if (!blob || blob.size >= file.size) return file;
        // Same name: the publish queue matches the server's created media back to its files by name.
        return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
    } catch {
        return file;
    } finally {
        bitmap?.close();
    }
}

// One at a time, so only one full-size photo is decoded in memory at once.
export async function shrinkImagesForUpload(files: File[], maxDimension: number): Promise<File[]> {
    const shrunk: File[] = [];
    for (const file of files) shrunk.push(await shrinkImageForUpload(file, maxDimension));
    return shrunk;
}

// A canvas keeps only the first frame, so an animated PNG or WebP would lose its motion when drawn. Reads only the
// headers: a PNG's chunks up to its first IDAT, a WebP's chunks up to its first image data.
const MAX_HEADER_CHUNKS = 64;

async function readBytes(file: Blob, start: number, length: number): Promise<Uint8Array> {
    return new Uint8Array(await file.slice(start, start + length).arrayBuffer());
}

function fourCC(bytes: Uint8Array, offset: number): string {
    return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

async function isAnimatedPng(file: Blob): Promise<boolean> {
    let offset = 8;
    for (let i = 0; i < MAX_HEADER_CHUNKS; i += 1) {
        const head = await readBytes(file, offset, 8);
        if (head.length < 8) return false;
        const type = fourCC(head, 4);
        if (type === 'acTL') return true;
        if (type === 'IDAT' || type === 'IEND') return false;
        const length = new DataView(head.buffer).getUint32(0);
        offset += 12 + length;
    }
    return false;
}

async function isAnimatedWebp(file: Blob): Promise<boolean> {
    const head = await readBytes(file, 0, 12);
    if (head.length < 12 || fourCC(head, 0) !== 'RIFF' || fourCC(head, 8) !== 'WEBP') return false;
    let offset = 12;
    for (let i = 0; i < MAX_HEADER_CHUNKS; i += 1) {
        const chunk = await readBytes(file, offset, 18);
        if (chunk.length < 8) return false;
        const type = fourCC(chunk, 0);
        if (type === 'ANIM' || type === 'ANMF') return true;
        if (type === 'VP8 ' || type === 'VP8L') return false;
        // VP8X: the flags byte follows the chunk header, and bit 0x02 is the animation flag.
        if (type === 'VP8X' && chunk.length > 8 && (chunk[8] & 0x02) !== 0) return true;
        const length = new DataView(chunk.buffer).getUint32(4, true);
        offset += 8 + length + (length % 2);
    }
    return false;
}

// True for an animated PNG (APNG) or animated WebP. Anything it can't read counts as not animated.
export async function isAnimatedImage(file: Blob & { type: string }): Promise<boolean> {
    try {
        if (file.type === 'image/png') return await isAnimatedPng(file);
        if (file.type === 'image/webp') return await isAnimatedWebp(file);
    } catch {
        return false;
    }
    return false;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.src = src;
    await image.decode();
    return image;
}

// The graduation frame (KAN-304): the photo, shrunk to the server's long edge like shrinkImageForUpload, with the
// frame drawn over it in one canvas pass. Same name and type: the upload matches results back to files by name.
// null when it can't be drawn; the caller then sends the photo as it was.
export async function frameImageForUpload(file: File, design: FramedDesign, text: FrameText, maxDimension: number): Promise<File | null> {
    if (!SHRINKABLE_TYPES.has(file.type)) return null;
    // Sent plain, like a GIF: drawing it would keep one frame.
    if (await isAnimatedImage(file)) return null;
    let bitmap: ImageBitmap | null = null;
    let overlay: HTMLImageElement | null = null;
    const canvas = document.createElement('canvas');
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const scale = maxDimension > 0 ? Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height)) : 1;
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) return null;
        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0, width, height);
        overlay = await loadImage(frameSvgDataUrl(frameSvg(design, { width, height }, text)));
        context.drawImage(overlay, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, ENCODE_QUALITY));
        if (!blob) return null;
        return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
    } catch {
        return null;
    } finally {
        bitmap?.close();
        // Release the pixels now: iOS Safari runs out of canvas memory across many large photos.
        canvas.width = 0;
        canvas.height = 0;
        if (overlay) overlay.src = '';
    }
}

// One at a time, like shrinkImagesForUpload. Videos are never framed; a photo that can't be is sent as it was and counted.
export async function framePhotosForUpload(
    files: File[],
    design: FramedDesign,
    text: FrameText,
    maxDimension: number,
): Promise<{ files: File[]; unframed: number }> {
    const out: File[] = [];
    let unframed = 0;
    for (const file of files) {
        if (file.type.startsWith('video/')) {
            out.push(file);
            continue;
        }
        const framed = await frameImageForUpload(file, design, text, maxDimension);
        if (framed) {
            out.push(framed);
        } else {
            out.push(file);
            unframed += 1;
        }
    }
    return { files: out, unframed };
}
