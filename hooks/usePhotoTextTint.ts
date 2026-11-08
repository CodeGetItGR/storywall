import { useEffect, useSyncExternalStore } from 'react';

import {
    isTextHardToReadOnPhoto,
    photoTextTint,
    type PhotoTint,
    type PhotoTone,
    type TextContrastSetting,
} from '@/lib/invitation/photoContrast';
import { readPhotoTone, requestPhotoTones, subscribePhotoTones } from '@/lib/invitation/photoToneStore';

// The measured tone of the photos behind a section. The server and the first
// render in the browser have none yet, so both draw the same markup.
export function usePhotoTone(photos: readonly string[]): PhotoTone | null | undefined {
    const key = photos.join('\n');
    const tone = useSyncExternalStore(
        subscribePhotoTones,
        () => readPhotoTone(key.split('\n')),
        () => undefined,
    );
    useEffect(() => requestPhotoTones(key.split('\n')), [key]);
    return tone;
}

// The tint that keeps text of `textColor` readable on these photos: undefined
// while they are measured, null when they could not be or need none.
export function usePhotoTextTint(photos: readonly string[], textColor: string): PhotoTint | null | undefined {
    const tone = usePhotoTone(photos);
    if (tone === undefined) return undefined;
    return tone ? photoTextTint(tone, textColor) : null;
}

// For the editor: whether a section's text is still hard to read on its photo
// with the host's text contrast setting. False while the photo is measured or
// when it can't be.
export function usePhotoTextWarning(photos: readonly string[], setting: TextContrastSetting, textColor: string): boolean {
    const tone = usePhotoTone(photos);
    return tone ? isTextHardToReadOnPhoto(tone, setting, textColor) : false;
}
