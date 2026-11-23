'use client';

import { useMemo } from 'react';

import { useTextStylePresets } from '@/hooks/useTextStylePresets';
import type { TextStylePresetDto } from '@/lib/api/types';
import { type InvitationFontDto, uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

const NONE: TextStylePresetDto[] = [];

// Feed edit mode's Style presets, and the @font-face rules for the uploaded fonts they name, so the Style menu and a
// restyled text draw in the preset's font before the layout is saved.
export function useFeedTextPresets(uploadedFonts: InvitationFontDto[] | undefined) {
    const query = useTextStylePresets();
    const presets = query.data ?? NONE;
    const fontFaces = useMemo(
        () => uploadedFontFaceCss(uploadedFonts ?? [], presets.map((preset) => preset.font)),
        [presets, uploadedFonts],
    );
    return { presets, fontFaces };
}
