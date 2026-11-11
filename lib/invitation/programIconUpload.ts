import type { SectionData } from '@/lib/invitation/sectionSettings';

// A program row's own icon (old wedartProgramIconUpload). SVG icons are drawn
// to a PNG first, as the old editor did, and tinted with the icon colour;
// PNG and WebP icons keep their own colours.

export const ICON_MAX_BYTES = 5 * 1024 * 1024;
export const ICON_SVG_MAX_PX = 512;
export const ICON_ACCEPT = 'image/svg+xml,image/png,image/webp';

const RASTER_TYPES = ['image/png', 'image/webp'];

export type IconUploadProblem = 'type' | 'size' | 'failed';

// GET/POST /api/invitation-drafts/{id}/images (guestwall-be InvitationDraftImageDto).
export type InvitationDraftImageDto = {
    mediaId: string;
    url: string;
    contentType: string;
    width: number;
    height: number;
    byteSize: number;
};

export type CustomProgramIcon = Extract<SectionData<'programIcons'>['items'][number]['icon'], { kind: 'custom' }>;

export function isSvgFile(file: Pick<File, 'type' | 'name'>): boolean {
    return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
}

export function iconUploadProblem(file: Pick<File, 'type' | 'name' | 'size'>): IconUploadProblem | null {
    if (!isSvgFile(file) && !RASTER_TYPES.includes(file.type)) return 'type';
    if (file.size > ICON_MAX_BYTES) return 'size';
    return null;
}

// The icon a stored upload becomes in the document.
export function customProgramIcon(mediaId: string, fileName: string, isSvg: boolean): CustomProgramIcon {
    return { kind: 'custom', image: { source: 'media', mediaId }, mode: isSvg ? 'mask' : 'image', name: fileName.slice(0, 300) };
}

// The size an SVG is drawn at: its own, within 512 px on the long side.
export function svgRasterSize(width: number, height: number): { width: number; height: number } {
    const w = width > 0 ? width : ICON_SVG_MAX_PX;
    const h = height > 0 ? height : ICON_SVG_MAX_PX;
    const scale = Math.min(1, ICON_SVG_MAX_PX / Math.max(w, h));
    return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

// Draws an SVG file to a PNG in the browser.
export async function svgToPng(file: File): Promise<File> {
    const url = URL.createObjectURL(file);
    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('svg'));
            img.src = url;
        });
        const size = svgRasterSize(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('canvas');
        context.drawImage(image, 0, 0, size.width, size.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('png');
        return new File([blob], file.name.replace(/\.svg$/i, '') + '.png', { type: 'image/png' });
    } finally {
        URL.revokeObjectURL(url);
    }
}
