'use client';

import { useMemo } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { fontLabel, type FontOption, INVITATION_FONTS, sameFont, uploadedFontOptions } from '@/lib/invitation/textEditing';
import { uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

// The fonts a Style preset can use (the editor's own, then the uploaded ones), and the @font-face rule for the one
// picked, so the preview draws in it. A saved font no longer offered stays in the list under its own name.
export function useTextStyleFontChoices(font: string) {
    const uploaded = useInvitationFonts(true);
    const options = useMemo<FontOption[]>(() => {
        const all = [...INVITATION_FONTS, ...uploadedFontOptions(uploaded.data ?? [])];
        return !font || all.some((option) => sameFont(option.value, font)) ? all : [...all, { value: font, label: fontLabel(font) }];
    }, [font, uploaded.data]);
    const fontFaces = useMemo(() => uploadedFontFaceCss(uploaded.data ?? [], [font]), [font, uploaded.data]);
    return { options, fontFaces };
}
