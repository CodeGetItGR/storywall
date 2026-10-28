'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { adminQrCardTemplateKeys, useCreateQrCardTemplate, usePatchQrCardTemplate, useUploadQrCardArtwork } from '@/hooks/useAdminQrCardTemplates';
import { adminThemeFontKeys, useAdminThemeFonts } from '@/hooks/useAdminThemeFonts';
import {
    buildQrCardTemplateCreatePayload,
    buildQrCardTemplatePatchPayload,
    codeContrastRatio,
    draftFromQrCardTemplate,
    type QrCardTemplateDraft,
    validateQrCardTemplateDraft,
} from '@/lib/adminQrCards';
import { illustrationFileError, themeFontOptions, toggleEventType } from '@/lib/adminThemePresets';
import { ERROR_CODES, getErrorCode, isNotFoundError } from '@/lib/api/errors';
import type { AdminQrCardTemplateDto, EventThemeFontDto, EventTypeConvention } from '@/lib/api/types';
import { isHexColor } from '@/lib/eventTheme';
import { resolveLocalizedText } from '@/lib/localizedText';
import { QR_CARD_INK, type QrCardStyle } from '@/lib/qrCard';

export type QrCardTemplateDrawerError = { kind: 'notFound' } | { kind: 'other'; error: unknown };
export type QrCardTemplateAvailability = 'AVAILABLE' | 'ARCHIVED';
export type QrCardFontsStatus = 'loading' | 'error' | 'ready';

// 404 means another admin's change removed the design from under this drawer.
function classifyError(error: unknown): QrCardTemplateDrawerError {
    if (isNotFoundError(error)) return { kind: 'notFound' };
    return { kind: 'other', error };
}

// A colour input only takes a lower-case #rrggbb; a half-typed colour shows ink.
function colorInputValue(value: string): string {
    return (isHexColor(value) ? value : QR_CARD_INK).toLowerCase();
}

export function useQrCardTemplateDrawer({
    template,
    sortOrder,
    onDoneAction,
}: {
    template: AdminQrCardTemplateDto | null;
    sortOrder: number;
    onDoneAction: () => void;
}) {
    const locale = useLocale();
    const queryClient = useQueryClient();
    const create = useCreateQrCardTemplate();
    const patch = usePatchQrCardTemplate();
    const upload = useUploadQrCardArtwork();
    const fonts = useAdminThemeFonts();

    // After a create the drawer edits the new design, so retrying a failed upload doesn't create it twice.
    const [saved, setSaved] = useState<AdminQrCardTemplateDto | null>(template);
    const isCreate = saved === null;
    const [draft, setDraft] = useState<QrCardTemplateDraft>(() => draftFromQrCardTemplate(template));
    const [submitted, setSubmitted] = useState(false);
    const [failure, setFailure] = useState<QrCardTemplateDrawerError | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<'type' | 'size' | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    // Set synchronously: a fast double click submits twice before isSaving re-renders.
    const submitting = useRef(false);
    // Cleared on unmount: a save still in flight then stops before the upload and never calls
    // onDoneAction, which would otherwise act on whatever drawer is open by then.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // Revokes the previous preview whenever it's replaced, and the last one on unmount.
    useEffect(() => {
        return () => {
            if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        };
    }, [filePreviewUrl]);

    const errors = useMemo(() => validateQrCardTemplateDraft(draft, saved?.codeColor), [draft, saved]);

    const fontOptions = useMemo(() => themeFontOptions(fonts.data, saved?.headingFont ?? null), [fonts.data, saved]);
    // What the preview draws the title in: the list's copy of the selected font, else the design's own.
    const previewFont = useMemo<EventThemeFontDto | null>(() => {
        if (!draft.headingFontId) return null;
        const font =
            fonts.data?.find((item) => item.id === draft.headingFontId) ??
            (saved?.headingFont?.id === draft.headingFontId ? saved.headingFont : null);
        return font?.url ? { key: font.key, fallback: font.fallback, url: font.url } : null;
    }, [draft.headingFontId, fonts.data, saved]);

    const previewStyle = useMemo<QrCardStyle>(
        () => ({
            id: saved?.id ?? 'new',
            artworkUrl: filePreviewUrl ?? saved?.artworkUrl ?? null,
            textColor: isHexColor(draft.textColor) ? draft.textColor : QR_CARD_INK,
            headingFont: previewFont,
            codeColor: isHexColor(draft.codeColor) ? draft.codeColor : QR_CARD_INK,
            centerLogo: draft.centerLogo,
        }),
        [draft, filePreviewUrl, previewFont, saved],
    );

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.currentTarget;
        setDraft((current) => ({ ...current, [name]: value }));
    }, []);

    const handleEventTypeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const eventType = event.currentTarget.value as EventTypeConvention;
        setDraft((current) => ({ ...current, eventTypes: toggleEventType(current.eventTypes, eventType) }));
    }, []);

    const handleCenterLogoChange = useCallback((centerLogo: boolean) => setDraft((current) => ({ ...current, centerLogo })), []);

    const handleAvailabilityChange = useCallback((availability: QrCardTemplateAvailability) => {
        setDraft((current) => ({ ...current, archived: availability === 'ARCHIVED' }));
    }, []);

    // Type and size only; the server checks the A6 shape and width (3111).
    const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const next = event.currentTarget.files?.[0] ?? null;
        // Lets the same file be picked again after a refusal.
        event.currentTarget.value = '';
        if (!next) return;
        const problem = illustrationFileError(next);
        setFileError(problem);
        if (problem) return;
        setFile(next);
        setFilePreviewUrl(URL.createObjectURL(next));
    }, []);

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            setFailure(null);
            if (Object.keys(errors).length > 0 || submitting.current) return;
            submitting.current = true;

            let current = saved;
            try {
                if (current === null) {
                    current = await create.mutateAsync(buildQrCardTemplateCreatePayload(draft, sortOrder));
                    if (!mounted.current) return;
                    setSaved(current);
                } else {
                    const input = buildQrCardTemplatePatchPayload(current, draft);
                    if (Object.keys(input).length > 0) {
                        current = await patch.mutateAsync({ id: current.id, input });
                        setSaved(current);
                    }
                }
                if (!mounted.current) return;
                if (file) {
                    setSaved(await upload.mutateAsync({ id: current.id, file }));
                    setFile(null);
                }
                if (!mounted.current) return;
                onDoneAction();
            } catch (error) {
                if (!mounted.current) return;
                const classified = classifyError(error);
                if (classified.kind === 'notFound') void queryClient.invalidateQueries({ queryKey: adminQrCardTemplateKeys.all });
                // The picked font can no longer be assigned: refetch the list so the select stops offering it.
                if (getErrorCode(error) === ERROR_CODES.THEME_FONT_NOT_ASSIGNABLE) {
                    void queryClient.invalidateQueries({ queryKey: adminThemeFontKeys.all });
                }
                setFailure(classified);
            } finally {
                submitting.current = false;
            }
        },
        [create, draft, errors, file, onDoneAction, patch, queryClient, saved, sortOrder, upload],
    );

    return {
        isCreate,
        // The saved design's name, for the heading once a create has gone through.
        savedName: resolveLocalizedText(saved?.name, locale),
        draft,
        errors: submitted ? errors : {},
        failure,
        fileError,
        hasPendingFile: file !== null,
        textColorInputValue: colorInputValue(draft.textColor),
        codeColorInputValue: colorInputValue(draft.codeColor),
        // The code colour against the white panel; null while it isn't a valid colour.
        codeContrastRatio: isHexColor(draft.codeColor) ? codeContrastRatio(draft.codeColor) : null,
        availability: (draft.archived ? 'ARCHIVED' : 'AVAILABLE') as QrCardTemplateAvailability,
        previewStyle,
        previewTitle: (locale === 'el' ? draft.nameEl : draft.nameEn).trim(),
        fontOptions,
        // Fonts a design can newly take: live, with a file.
        hasUsableFonts: fonts.data?.some((font) => !font.archived && font.url) ?? false,
        // A failed refetch over cached data still has a list to offer.
        fontsStatus: (fonts.isPending ? 'loading' : fonts.isError && !fonts.data ? 'error' : 'ready') as QrCardFontsStatus,
        isSaving: create.isPending || patch.isPending || upload.isPending,
        handleFieldChange,
        handleEventTypeChange,
        handleCenterLogoChange,
        handleAvailabilityChange,
        handleFileChange,
        handleSubmit,
    };
}
