import { ApiError } from '@/lib/api/client';

// The host's photos (old wedartUploadGalleryImage): JPEG, PNG or WebP of at most
// 10 MB as picked, made smaller in the browser before sending, since the server
// takes at most 5 MB and 4096 px a side and scales anything past 2560 px down anyway.

export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
const PHOTO_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

// What browser-image-compression is asked for.
export const PHOTO_COMPRESSION = { maxSizeMB: 1.5, maxWidthOrHeight: 2560, initialQuality: 0.85, useWebWorker: true } as const;

// Why a photo isn't on the page: a file the server would refuse, a failed upload,
// a draft (100) or an account (300) with no room left, or a gallery that holds 10 already.
export type PhotoProblem = 'type' | 'size' | 'failed' | 'full' | 'galleryFull';

const NO_ROOM_CODES = new Set([5213, 5215]);

export function photoFileProblem(file: Pick<File, 'type' | 'size'>): PhotoProblem | null {
    if (!PHOTO_TYPES.includes(file.type)) return 'type';
    if (file.size > PHOTO_MAX_BYTES) return 'size';
    return null;
}

export function photoUploadProblem(error: unknown): PhotoProblem {
    if (error instanceof ApiError && NO_ROOM_CODES.has(Number(error.problem?.errorCode))) return 'full';
    return 'failed';
}

// The upload's progress as one number: making the file smaller is the first 90%,
// and the last part waits for the server.
export function photoUploadPercent(phase: 'compressing' | 'sending', compressed: number): number {
    if (phase === 'sending') return 90;
    return Math.round(Math.min(100, Math.max(0, compressed)) * 0.9);
}
