export interface StoryFilterOverlay {
    type: 'grain' | 'vignette' | 'wash';
    opacity: number;
}

export interface StoryFilterPreset {
    id: string;
    cssFilter: string;
    overlays?: StoryFilterOverlay[];
}

export const STORY_FILTER_PRESETS: StoryFilterPreset[] = [
    { id: 'original', cssFilter: '' },
    { id: 'warm', cssFilter: 'brightness(1.05) saturate(1.15) sepia(0.08) contrast(1.05)' },
    { id: 'goldenHour', cssFilter: 'sepia(0.25) saturate(1.2) brightness(1.05)' },
    { id: 'cool', cssFilter: 'saturate(1.1) brightness(0.98) contrast(1.05) hue-rotate(180deg) saturate(1.05)' },
    { id: 'vivid', cssFilter: 'saturate(1.4) contrast(1.15)' },
    { id: 'fade', cssFilter: 'contrast(0.85) brightness(1.1) saturate(0.9)', overlays: [{ type: 'wash', opacity: 0.08 }] },
    { id: 'mono', cssFilter: 'grayscale(1) contrast(1.1)' },
    { id: 'noir', cssFilter: 'grayscale(1) contrast(1.3) brightness(0.9)', overlays: [{ type: 'vignette', opacity: 0.15 }] },
    {
        id: 'vintage',
        cssFilter: 'sepia(0.15) contrast(0.95) saturate(0.85)',
        overlays: [
            { type: 'grain', opacity: 0.12 },
            { type: 'vignette', opacity: 0.15 },
        ],
    },
];

function drawOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, overlay: StoryFilterOverlay) {
    ctx.filter = 'none';
    ctx.globalAlpha = overlay.opacity;
    if (overlay.type === 'wash') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    } else if (overlay.type === 'vignette') {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, height / 3, width / 2, height / 2, height / 1.1);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    } else {
        // grain: a coarse, seeded-random dot pattern stands in for a noise texture without a static asset.
        ctx.fillStyle = '#808080';
        for (let x = 0; x < width; x += 3) {
            for (let y = 0; y < height; y += 3) {
                if (Math.random() > 0.5) ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    ctx.globalAlpha = 1;
}

export async function bakeStoryFilter(file: File, preset: StoryFilterPreset): Promise<File> {
    if (preset.id === 'original') return file;

    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.filter = preset.cssFilter;
    ctx.drawImage(bitmap, 0, 0);
    for (const overlay of preset.overlays ?? []) {
        drawOverlay(ctx, canvas.width, canvas.height, overlay);
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type));
    if (!blob) return file;
    return new File([blob], file.name, { type: file.type });
}
