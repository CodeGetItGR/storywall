'use client';

import { useCallback, useMemo, useState } from 'react';

import type { TextStylePresetDto, TextStylePresetRequestDto } from '@/lib/api/types';

export const EMPTY_PRESET: TextStylePresetRequestDto = {
    nameEn: '',
    nameEl: '',
    font: '',
    size: 32,
    weight: 'NORMAL',
    italic: false,
    letterSpacing: 0,
    uppercase: false,
};

function requestOf(preset: TextStylePresetDto): TextStylePresetRequestDto {
    const { nameEn, nameEl, font, size, weight, italic, letterSpacing, uppercase } = preset;
    return { nameEn, nameEl, font, size, weight, italic, letterSpacing, uppercase };
}

// The drawer's form for one preset: its values while editing, and whether they can be saved (the backend's limits).
// The drawer is keyed by its opening, so each opening starts from the preset's saved values.
export function useTextStylePresetDrawer(preset: TextStylePresetDto | null) {
    const [draft, setDraft] = useState<TextStylePresetRequestDto>(() => (preset ? requestOf(preset) : EMPTY_PRESET));
    const set = useCallback((patch: Partial<TextStylePresetRequestDto>) => setDraft((current) => ({ ...current, ...patch })), []);
    const valid = useMemo(
        () =>
            draft.nameEn.trim() !== '' &&
            draft.nameEl.trim() !== '' &&
            draft.font.trim() !== '' &&
            Number.isFinite(draft.size) &&
            draft.size >= 6 &&
            draft.size <= 400 &&
            Number.isFinite(draft.letterSpacing) &&
            draft.letterSpacing >= -5 &&
            draft.letterSpacing <= 50,
        [draft],
    );
    const body = useMemo(() => ({ ...draft, nameEn: draft.nameEn.trim(), nameEl: draft.nameEl.trim() }), [draft]);
    return { draft, set, valid, body };
}
