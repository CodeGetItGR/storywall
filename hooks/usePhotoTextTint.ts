import { type RefObject, useEffect, useState, useSyncExternalStore } from 'react';

import {
    isTextHardToReadOnPhoto,
    photoTextTint,
    type PhotoTint,
    type PhotoTone,
    shownPhoto,
    type TextContrastSetting,
} from '@/lib/invitation/photoContrast';
import { readPhotoTone, requestPhotoTone, subscribePhotoTones } from '@/lib/invitation/photoToneStore';
import type { SectionPhotos } from '@/lib/invitation/render';

const noTone = () => undefined;

// The measured tone of one photo. The server and the first render in the
// browser have none yet, so both draw the same markup.
export function usePhotoTone(photo: string | undefined): PhotoTone | null | undefined {
    const tone = useSyncExternalStore(subscribePhotoTones, () => (photo ? readPhotoTone(photo) : undefined), noTone);
    useEffect(() => {
        if (photo) requestPhotoTone(photo);
    }, [photo]);
    return tone;
}

// The width of the invitation around `ref`, which picks a theme background's
// desktop or mobile photo. Undefined until it is laid out.
function useInvitationWidth(ref: RefObject<HTMLElement | null>, needed: boolean): number | undefined {
    const [width, setWidth] = useState<number>();
    useEffect(() => {
        const element = ref.current;
        // Without a way to watch the width, the section stays as it is.
        if (!needed || !element || typeof ResizeObserver === 'undefined') return undefined;
        const invitation = element.closest<HTMLElement>('.smd-invitation');
        // Outside an invitation no container query applies, so the desktop photo shows.
        const observer = new ResizeObserver(([entry]) => setWidth(invitation ? entry.contentRect.width : Infinity));
        observer.observe(invitation ?? element);
        return () => observer.disconnect();
    }, [ref, needed]);
    return width;
}

// The one photo the invitation shows behind the section at its current width,
// so a phone never downloads the desktop photo just to measure it.
export function useShownPhoto(ref: RefObject<HTMLElement | null>, photos: SectionPhotos | undefined): string | undefined {
    const differs = !!photos && photos.desktop !== photos.mobile;
    const width = useInvitationWidth(ref, differs);
    if (!photos) return undefined;
    if (!differs) return photos.desktop;
    return width === undefined ? undefined : shownPhoto(photos, width);
}

// The tint that keeps text with no colour of its own (`textColor`) readable on
// this photo: undefined while it is measured, null when it could not be or
// needs none.
export function usePhotoTextTint(photo: string | undefined, textColor: string): PhotoTint | null | undefined {
    const tone = usePhotoTone(photo);
    if (tone === undefined) return undefined;
    return tone ? photoTextTint(tone, textColor) : null;
}

// For the editor: whether a section's text is still hard to read on its photo
// with the host's text contrast setting. False while the photo is measured or
// when it can't be.
export function usePhotoTextWarning(photo: string | undefined, setting: TextContrastSetting, textColor: string): boolean {
    const tone = usePhotoTone(photo);
    return tone ? isTextHardToReadOnPhoto(tone, setting, textColor) : false;
}
