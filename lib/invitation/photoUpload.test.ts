import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { PHOTO_MAX_BYTES, photoFileProblem, photoUploadPercent, photoUploadProblem } from '@/lib/invitation/photoUpload';

const refusal = (status: number, errorCode: number) => new ApiError(status, { status, errorCode, title: 'Refused' });

describe('photo uploads', () => {
    it('takes JPEG, PNG and WebP of at most 10 MB', () => {
        expect(photoFileProblem({ type: 'image/jpeg', size: 1000 })).toBeNull();
        expect(photoFileProblem({ type: 'image/png', size: PHOTO_MAX_BYTES })).toBeNull();
        expect(photoFileProblem({ type: 'image/webp', size: 1000 })).toBeNull();
        expect(photoFileProblem({ type: 'image/gif', size: 1000 })).toBe('type');
        expect(photoFileProblem({ type: 'image/heic', size: 1000 })).toBe('type');
        expect(photoFileProblem({ type: 'image/jpeg', size: PHOTO_MAX_BYTES + 1 })).toBe('size');
    });

    it('tells a full draft or account from other failures', () => {
        expect(photoUploadProblem(refusal(409, 5213))).toBe('full');
        expect(photoUploadProblem(refusal(409, 5215))).toBe('full');
        expect(photoUploadProblem(refusal(413, 3013))).toBe('failed');
        expect(photoUploadProblem(refusal(502, 5004))).toBe('failed');
        expect(photoUploadProblem(new Error('offline'))).toBe('failed');
    });

    it('spends 90% on making the file smaller and holds there while sending', () => {
        expect(photoUploadPercent('compressing', 0)).toBe(0);
        expect(photoUploadPercent('compressing', 50)).toBe(45);
        expect(photoUploadPercent('compressing', 150)).toBe(90);
        expect(photoUploadPercent('sending', 100)).toBe(90);
    });
});
