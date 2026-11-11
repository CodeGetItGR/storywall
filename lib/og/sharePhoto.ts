import sharp, { type Sharp } from 'sharp';

import { OG_IMAGE_SIZE } from '@/lib/seo';

// WhatsApp drops link preview pictures past about 300 KB.
export const SHARE_IMAGE_MAX_BYTES = 300 * 1024;

// Tried in order until the picture fits under the limit.
const JPEG_QUALITIES = [82, 72, 62, 50];

// Encodes a picture as a JPEG small enough for every messaging app.
export async function shareJpeg(image: Sharp): Promise<Buffer> {
    let jpeg = Buffer.alloc(0);
    for (const quality of JPEG_QUALITIES) {
        jpeg = await image.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
        if (jpeg.length <= SHARE_IMAGE_MAX_BYTES) break;
    }
    return jpeg;
}

// Where the crop sits, in percent across and down (as CSS object-position). Hosts' photos are mostly
// tall and the preview is wide: the upper third keeps the faces. The host's own photo position is set
// for the invitation's frame, not this shape, so it isn't used.
const CROP_X = 50;
const CROP_Y = 30;

// Fills the preview's 1200×630 with the photo. Webp and other formats the renderer can't read are
// fine: sharp decodes them. Null when the photo can't be fetched or read.
export async function cropSharePhoto(url: string): Promise<Buffer | null> {
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return null;
        // Turned upright first, so the size read next is the one shown.
        const upright = await sharp(Buffer.from(await res.arrayBuffer())).rotate().toBuffer();
        const source = sharp(upright);
        const { width = 0, height = 0 } = await source.metadata();
        if (!width || !height) return null;

        const { width: targetWidth, height: targetHeight } = OG_IMAGE_SIZE;
        const scale = Math.max(targetWidth / width, targetHeight / height);
        const scaledWidth = Math.max(targetWidth, Math.round(width * scale));
        const scaledHeight = Math.max(targetHeight, Math.round(height * scale));
        const left = Math.round(((scaledWidth - targetWidth) * CROP_X) / 100);
        const top = Math.round(((scaledHeight - targetHeight) * CROP_Y) / 100);

        const cropped = source
            .resize(scaledWidth, scaledHeight, { fit: 'fill' })
            .extract({ left, top, width: targetWidth, height: targetHeight })
            // A transparent picture gets a white backdrop instead of black.
            .flatten({ background: '#ffffff' });
        return await shareJpeg(cropped);
    } catch {
        return null;
    }
}
