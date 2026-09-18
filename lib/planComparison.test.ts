import { describe, expect, it } from 'vitest';

import { mediaEstimate } from '@/lib/planComparison';

const CONFIG = { estimateAvgImageBytes: 4 * 1024 * 1024, estimateAvgVideoBytes: 90 * 1024 * 1024, estimateImageRatio: 0.7 };

describe('mediaEstimate', () => {
    it('returns null for unlimited storage', () => {
        expect(mediaEstimate(null, CONFIG)).toBeNull();
    });

    it('splits storage by the configured image/video ratio before dividing by the average size', () => {
        const storageBytes = 1024 * 1024 * 1024; // 1 GB
        const result = mediaEstimate(storageBytes, CONFIG);

        const expectedImages = Math.floor((storageBytes * 0.7) / CONFIG.estimateAvgImageBytes);
        const expectedVideos = Math.floor((storageBytes * 0.3) / CONFIG.estimateAvgVideoBytes);

        expect(result).toEqual({ images: expectedImages.toLocaleString(), videos: expectedVideos.toLocaleString() });
    });

    it('never reports zero for a non-zero storage quota', () => {
        const result = mediaEstimate(1024, CONFIG); // tiny quota
        expect(result).toEqual({ images: '1', videos: '1' });
    });
});
