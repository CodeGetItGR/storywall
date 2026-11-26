import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { frameImageForUpload, framePhotosForUpload, shrinkImageForUpload, shrinkImagesForUpload } from '@/lib/uploadImageResize';

const drawImage = vi.fn();
let encoded: Blob | null;
let canvasSize: { width: number; height: number } | null;
let canvases: HTMLCanvasElement[];

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
    canvases = [];
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmapOf(4000, 3000)));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
        canvasSize = { width: this.width, height: this.height };
        canvases.push(this);
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

describe('frameImageForUpload', () => {
    const text = { title: 'Μαρία', date: '2 Ιουλίου 2026' };
    let loaded: string[];

    beforeEach(() => {
        loaded = [];
        // jsdom doesn't decode images: the frame's SVG "loads" at once.
        vi.stubGlobal(
            'Image',
            class {
                set src(value: string) {
                    loaded.push(value);
                }
                decode() {
                    return Promise.resolve();
                }
            },
        );
    });

    it('draws the photo, shrunk to the long edge, then the frame over it, keeping its name and type', async () => {
        const file = photo('a.jpg', 'image/jpeg', 4_000_000);
        const framed = await frameImageForUpload(file, 'CLASSIC', text, 2560);

        expect(canvasSize).toEqual({ width: 2560, height: 1920 });
        expect(drawImage).toHaveBeenCalledTimes(2);
        expect(drawImage.mock.calls[1].slice(1)).toEqual([0, 0, 2560, 1920]);
        expect(decodeURIComponent(loaded[0])).toContain('width="2560" height="1920"');
        expect(framed).toMatchObject({ name: 'a.jpg', type: 'image/jpeg', lastModified: 1234 });
    });

    it('releases the canvas once drawn, so many large photos do not run a phone out of memory', async () => {
        await frameImageForUpload(photo('a.jpg', 'image/jpeg', 4_000_000), 'CLASSIC', text, 2560);

        expect(canvases[0]).toMatchObject({ width: 0, height: 0 });
    });

    it('frames a small photo at its own size', async () => {
        vi.mocked(createImageBitmap).mockResolvedValue(bitmapOf(1200, 1600) as unknown as ImageBitmap);
        await frameImageForUpload(photo('a.jpg', 'image/jpeg', 300_000), 'LAUREL', text, 2560);
        expect(canvasSize).toEqual({ width: 1200, height: 1600 });
    });

    it("gives up on a photo it can't draw", async () => {
        expect(await frameImageForUpload(photo('a.gif', 'image/gif', 1000), 'CLASSIC', text, 2560)).toBeNull();
        vi.mocked(createImageBitmap).mockRejectedValue(new Error('decode'));
        expect(await frameImageForUpload(photo('a.jpg', 'image/jpeg', 1000), 'CLASSIC', text, 2560)).toBeNull();
        encoded = null;
        vi.mocked(createImageBitmap).mockResolvedValue(bitmapOf(400, 300) as unknown as ImageBitmap);
        expect(await frameImageForUpload(photo('b.jpg', 'image/jpeg', 1000), 'CLASSIC', text, 2560)).toBeNull();
    });
});

describe('framePhotosForUpload', () => {
    const text = { title: 'Μαρία', date: '' };

    beforeEach(() => {
        vi.stubGlobal(
            'Image',
            class {
                src = '';
                decode() {
                    return Promise.resolve();
                }
            },
        );
    });

    it('frames the photos, leaves videos alone, and counts the photos it sent without the frame', async () => {
        const jpeg = photo('a.jpg', 'image/jpeg', 4_000_000);
        const gif = photo('b.gif', 'image/gif', 1000);
        const video = photo('c.mp4', 'video/mp4', 9_000_000);

        const result = await framePhotosForUpload([jpeg, gif, video], 'CONFETTI', text, 2560);

        expect(result.files.map((file) => file.name)).toEqual(['a.jpg', 'b.gif', 'c.mp4']);
        expect(result.files[0]).not.toBe(jpeg);
        expect(result.files[1]).toBe(gif);
        expect(result.files[2]).toBe(video);
        expect(result.unframed).toBe(1);
    });
});
