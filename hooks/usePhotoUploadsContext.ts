'use client';

import { createContext, useContext } from 'react';

import type { PhotoUploadSlots } from '@/hooks/usePhotoUploads';

// The photo slots sit deep inside each section's renderer, so props can't reach
// them. Without it (stories of the bare canvas, guests) there is no camera.
export const PhotoUploadsContext = createContext<PhotoUploadSlots | null>(null);

export function usePhotoUploadsContext(): PhotoUploadSlots | null {
    return useContext(PhotoUploadsContext);
}
