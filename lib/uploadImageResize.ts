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
