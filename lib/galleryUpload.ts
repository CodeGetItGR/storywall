// What the gallery takes from a pick: photos and videos within their size limits, at most maxFiles at a time.
export type GalleryUploadLimits = { maxFiles: number; maxImageBytes: number; maxVideoBytes: number };

// Why some picked files were left out: one was too large, or the pick had other files or too many.
export type GalleryPickNotice = 'tooLarge' | 'limited' | null;

export function pickGalleryFiles(picked: readonly File[], { maxFiles, maxImageBytes, maxVideoBytes }: GalleryUploadLimits) {
    const isTooLarge = (file: File) =>
        (file.type.startsWith('image/') && file.size > maxImageBytes) || (file.type.startsWith('video/') && file.size > maxVideoBytes);
    const files = picked.filter((file) => (file.type.startsWith('image/') || file.type.startsWith('video/')) && !isTooLarge(file)).slice(0, maxFiles);
    const notice: GalleryPickNotice = picked.some(isTooLarge) ? 'tooLarge' : files.length < picked.length ? 'limited' : null;
    return { files, notice };
}
