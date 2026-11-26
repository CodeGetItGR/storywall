import { describe, expect, it } from 'vitest';

import { pickGalleryFiles } from '@/lib/galleryUpload';

const limits = { maxFiles: 2, maxImageBytes: 100, maxVideoBytes: 1000 };
const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });

describe('pickGalleryFiles', () => {
    it('keeps photos and videos within their limits', () => {
        const picked = [file('a.jpg', 'image/jpeg', 50), file('b.mp4', 'video/mp4', 500)];
        expect(pickGalleryFiles(picked, limits)).toEqual({ files: picked, notice: null });
    });

    it('leaves out a file that is too large and says so', () => {
        const { files, notice } = pickGalleryFiles([file('big.jpg', 'image/jpeg', 101), file('a.jpg', 'image/jpeg', 50)], limits);
        expect(files.map((f) => f.name)).toEqual(['a.jpg']);
        expect(notice).toBe('tooLarge');
    });

    it('leaves out other files and anything past the count', () => {
        const picked = [
            file('doc.pdf', 'application/pdf', 10),
            file('a.jpg', 'image/jpeg', 1),
            file('b.jpg', 'image/jpeg', 1),
            file('c.jpg', 'image/jpeg', 1),
        ];
        const { files, notice } = pickGalleryFiles(picked, limits);
        expect(files.map((f) => f.name)).toEqual(['a.jpg', 'b.jpg']);
        expect(notice).toBe('limited');
    });
});
