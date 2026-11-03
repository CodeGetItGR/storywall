'use client';

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminThemeFonts } from '@/hooks/useAdminThemeFonts';
import {
    buildQrCardLookPatchPayload,
    codeContrastRatio,
    lookDraftFromQrCardTemplate,
    qrCardArtworkFileError,
    type QrCardLookDraft,
    validateQrCardLookDraft,
} from '@/lib/adminQrCards';
import { themeFontOptions } from '@/lib/adminThemePresets';
import type { AdminQrCardTemplateDto, EventThemeFontDto } from '@/lib/api/types';
import { isHexColor } from '@/lib/eventTheme';
import { QR_CARD_INK, type QrCardStyle } from '@/lib/qrCard';
import { qrCardLayoutOf } from '@/lib/qrCardLayout';

export type QrCardFontsStatus = 'loading' | 'error' | 'ready';

// A colour input only takes a lower-case #rrggbb; a half-typed colour shows ink.
function colorInputValue(value: string): string {
    return (isHexColor(value) ? value : QR_CARD_INK).toLowerCase();
}

// The design's colours, title font, logo and a picked artwork file, as the layout editor edits them. Nothing
// is sent here: the editor's Save sends `patch` and uploads `file`.
export function useQrCardLook(template: AdminQrCardTemplateDto) {
    const fonts = useAdminThemeFonts();
    const [draft, setDraft] = useState<QrCardLookDraft>(() => lookDraftFromQrCardTemplate(template));
    const [submitted, setSubmitted] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<'type' | 'size' | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

    // Revokes the previous preview whenever it's replaced, and the last one on unmount.
    useEffect(() => {
        return () => {
            if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        };
    }, [filePreviewUrl]);

    const errors = useMemo(() => validateQrCardLookDraft(draft, template.codeColor), [draft, template.codeColor]);
    const patch = useMemo(() => buildQrCardLookPatchPayload(template, draft), [draft, template]);

    const fontOptions = useMemo(() => themeFontOptions(fonts.data, template.headingFont), [fonts.data, template.headingFont]);
    // What the card draws the title in: the list's copy of the selected font, else the design's own.
    const previewFont = useMemo<EventThemeFontDto | null>(() => {
        if (!draft.headingFontId) return null;
        const font =
            fonts.data?.find((item) => item.id === draft.headingFontId) ??
            (template.headingFont?.id === draft.headingFontId ? template.headingFont : null);
        return font?.url ? { key: font.key, fallback: font.fallback, url: font.url } : null;
    }, [draft.headingFontId, fonts.data, template.headingFont]);

    // The editor swaps in its own layout.
    const style = useMemo<QrCardStyle>(
        () => ({
            id: template.id,
            artworkUrl: filePreviewUrl ?? template.artworkUrl,
            textColor: isHexColor(draft.textColor) ? draft.textColor : QR_CARD_INK,
            headingFont: previewFont,
            codeColor: isHexColor(draft.codeColor) ? draft.codeColor : QR_CARD_INK,
            centerLogo: draft.centerLogo,
            layout: qrCardLayoutOf(template.layout),
            // The editor never prints, so its sizes don't matter.
            sizes: ['A6'],
        }),
        [draft, filePreviewUrl, previewFont, template],
    );

    // Inputs are named after the draft field they edit.
    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.currentTarget;
        setDraft((current) => ({ ...current, [name]: value }));
    }, []);
    const handleCenterLogoChange = useCallback((centerLogo: boolean) => setDraft((current) => ({ ...current, centerLogo })), []);

    // Type and size only; the server checks the A6 shape and the 1748 px width (3111).
    const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const next = event.currentTarget.files?.[0] ?? null;
        // Lets the same file be picked again after a refusal.
        event.currentTarget.value = '';
        if (!next) return;
        const problem = qrCardArtworkFileError(next);
        setFileError(problem);
        if (problem) return;
        setFile(next);
        setFilePreviewUrl(URL.createObjectURL(next));
    }, []);
    // The upload went through: the design's own artwork shows from now on.
    const clearFile = useCallback(() => {
        setFile(null);
        setFilePreviewUrl(null);
    }, []);
    const markSubmitted = useCallback(() => setSubmitted(true), []);

    return {
        draft,
        errors: submitted ? errors : {},
        isValid: Object.keys(errors).length === 0,
        patch,
        file,
        fileError,
        hasChanges: file !== null || Object.keys(patch).length > 0,
        style,
        textColorInputValue: colorInputValue(draft.textColor),
        codeColorInputValue: colorInputValue(draft.codeColor),
        // The code colour against the white panel; null while it isn't a valid colour.
        codeContrastRatio: isHexColor(draft.codeColor) ? codeContrastRatio(draft.codeColor) : null,
        // Whether a blocked save is down to the code colour, so the editor can point at the code.
        codeBlocksSave: Boolean(errors.codeColor || errors.codeContrast),
        fontOptions,
        // Fonts a design can newly take: live, with a file.
        hasUsableFonts: fonts.data?.some((font) => !font.archived && font.url) ?? false,
        // A failed refetch over cached data still has a list to offer.
        fontsStatus: (fonts.isPending ? 'loading' : fonts.isError && !fonts.data ? 'error' : 'ready') as QrCardFontsStatus,
        handleChange,
        handleCenterLogoChange,
        handleFileChange,
        clearFile,
        markSubmitted,
    };
}

export type QrCardLookState = ReturnType<typeof useQrCardLook>;
