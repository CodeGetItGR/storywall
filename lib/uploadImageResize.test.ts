import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { shrinkImageForUpload, shrinkImagesForUpload } from '@/lib/uploadImageResize';

const drawImage = vi.fn();
let encoded: Blob | null;
let canvasSize: { width: number; height: number } | null;

function photo(name: string, type: string, size: number): File {
    const file = new File(['x'], name, { type, lastModified: 1234 });
    Object.defineProperty(file, 'size', { value: size });
    return file;
}

function bitmapOf(width: number, height: number) {
    return { width, height, close: vi.fn() };
}

beforeEach(() => {
    drawImage.mockReset();
    encoded = new Blob(['small'], { type: 'image/jpeg' });
    canvasSize = null;
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmapOf(4000, 3000)));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
        canvasSize = { width: this.width, height: this.height };
        return { drawImage, imageSmoothingQuality: 'low' } as unknown as CanvasRenderingContext2D;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(encoded));
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('shrinkImageForUpload', () => {
    it("scales a photo larger than the server's long edge down to it, keeping its name and type", async () => {
        const file = photo('IMG_1.jpg', 'image/jpeg', 4_000_000);

        const result = await shrinkImageForUpload(file, 2560);

        expect(canvasSize).toEqual({ width: 2560, height: 1920 });
        expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2560, 1920);
        expect(result).not.toBe(file);
        expect(result.name).toBe('IMG_1.jpg');
        expect(result.type).toBe('image/jpeg');
        expect(result.size).toBe(encoded!.size);
    });

    it('measures the long edge on portrait photos too', async () => {
        vi.mocked(createImageBitmap).mockResolvedValue(bitmapOf(3000, 4000) as unknown as ImageBitmap);

        await shrinkImageForUpload(photo('p.jpg', 'image/jpeg', 4_000_000), 2560);

        expect(canvasSize).toEqual({ width: 1920, height: 2560 });
    });

    it('applies the photo orientation from its EXIF data when decoding', async () => {
        await shrinkImageForUpload(photo('a.jpg', 'image/jpeg', 4_000_000), 2560);

        expect(createImageBitmap).toHaveBeenCalledWith(expect.any(File), { imageOrientation: 'from-image' });
    });

    it('sends a photo already within the long edge untouched', async () => {
        vi.mocked(createImageBitmap).mockResolvedValue(bitmapOf(2560, 1440) as unknown as ImageBitmap);
        const file = photo('small.jpg', 'image/jpeg', 900_000);

        expect(await shrinkImageForUpload(file, 2560)).toBe(file);
        expect(drawImage).not.toHaveBeenCalled();
    });

    it.each([
        ['a GIF, whose animation a canvas would lose', 'anim.gif', 'image/gif'],
        ['a video', 'clip.mp4', 'video/mp4'],
        ['a file the browser gave no type', 'mystery', ''],
    ])('leaves %s alone', async (_label, name, type) => {
        const file = photo(name, type, 4_000_000);

        expect(await shrinkImageForUpload(file, 2560)).toBe(file);
        expect(createImageBitmap).not.toHaveBeenCalled();
    });

    it('sends the original when the browser cannot decode it', async () => {
        vi.mocked(createImageBitmap).mockRejectedValue(new DOMException('decode failed'));
        const file = photo('broken.jpg', 'image/jpeg', 4_000_000);

        expect(await shrinkImageForUpload(file, 2560)).toBe(file);
    });

    it('sends the original when re-encoding fails or comes out no smaller', async () => {
        const file = photo('tiny.png', 'image/png', 3);

        encoded = null;
        expect(await shrinkImageForUpload(file, 2560)).toBe(file);
        encoded = new Blob(['bigger than three bytes'], { type: 'image/png' });
        expect(await shrinkImageForUpload(file, 2560)).toBe(file);
    });

    it('frees the decoded bitmap', async () => {
        const bitmap = bitmapOf(4000, 3000);
        vi.mocked(createImageBitmap).mockResolvedValue(bitmap as unknown as ImageBitmap);

        await shrinkImageForUpload(photo('a.jpg', 'image/jpeg', 4_000_000), 2560);

        expect(bitmap.close).toHaveBeenCalled();
    });
});

describe('shrinkImagesForUpload', () => {
    it('keeps the order of the files', async () => {
        const files = [photo('1.jpg', 'image/jpeg', 4_000_000), photo('2.mp4', 'video/mp4', 9_000_000), photo('3.jpg', 'image/jpeg', 4_000_000)];

        const result = await shrinkImagesForUpload(files, 2560);

        expect(result.map((file) => file.name)).toEqual(['1.jpg', '2.mp4', '3.jpg']);
        expect(result[1]).toBe(files[1]);
    });
});
