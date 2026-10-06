'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminThemeFonts } from '@/hooks/useAdminThemeFonts';
import { adminThemePresetKeys, useCreateThemePreset, usePatchThemePreset, useUploadThemePresetIllustration } from '@/hooks/useAdminThemePresets';
import {
    buildThemePresetCreatePayload,
    buildThemePresetPatchPayload,
    contrastRatio,
    draftFromPreset,
    illustrationFileError,
    INK_COLOR,
    inkContrastRatio,
    normalizePresetKeyInput,
    themeFontOptions,
    type ThemePresetDraft,
    toggleEventType,
    validateThemePresetDraft,
} from '@/lib/adminThemePresets';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode, isNotFoundError } from '@/lib/api/errors';
import type { AdminThemePresetDto, EventThemeFontDto, EventTypeConvention } from '@/lib/api/types';
import { isHexColor } from '@/lib/eventTheme';

export type ThemePresetDrawerError = { kind: 'keyTaken' } | { kind: 'notFound' } | { kind: 'other'; error: unknown };
export type ThemePresetAvailability = 'AVAILABLE' | 'ARCHIVED';
export type ThemeFontsStatus = 'loading' | 'error' | 'ready';

// 409 on create is a duplicate key (shown on the key field), except 5145, a font the preset can't
// take; 404 means another admin's change removed the preset from under this drawer.
function classifyError(error: unknown, duringCreate: boolean): ThemePresetDrawerError {
    if (duringCreate && error instanceof ApiError && error.status === 409 && getErrorCode(error) !== ERROR_CODES.THEME_FONT_NOT_ASSIGNABLE) {
        return { kind: 'keyTaken' };
    }
    if (isNotFoundError(error)) return { kind: 'notFound' };
    return { kind: 'other', error };
}

export function useThemePresetDrawer({
    preset,
    sortOrder,
    onDoneAction,
}: {
    preset: AdminThemePresetDto | null;
    sortOrder: number;
    onDoneAction: () => void;
}) {
    const locale = useLocale();
    const queryClient = useQueryClient();
    const create = useCreateThemePreset();
    const patch = usePatchThemePreset();
    const upload = useUploadThemePresetIllustration();
    const fonts = useAdminThemeFonts();

    // After a create the drawer edits the new preset, so retrying a failed
    // upload doesn't create it a second time.
    const [saved, setSaved] = useState<AdminThemePresetDto | null>(preset);
    const isCreate = saved === null;
    const [draft, setDraft] = useState<ThemePresetDraft>(() => draftFromPreset(preset));
    const [submitted, setSubmitted] = useState(false);
    const [failure, setFailure] = useState<ThemePresetDrawerError | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<'type' | 'size' | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    // Set synchronously: a fast double click submits twice before isSaving re-renders.
    const submitting = useRef(false);

    // Revokes the previous preview whenever it's replaced, and the last one on unmount.
    useEffect(() => {
        return () => {
            if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        };
    }, [filePreviewUrl]);

    const errors = useMemo(() => validateThemePresetDraft(draft, isCreate, saved?.backgroundColor, saved?.titleColor), [draft, isCreate, saved]);

    const fontOptions = useMemo(() => themeFontOptions(fonts.data, saved?.headingFont ?? null), [fonts.data, saved]);
    // What the preview draws the title in: the list's copy of the selected font, else the preset's own.
    const previewFont = useMemo<EventThemeFontDto | null>(() => {
        if (!draft.headingFontId) return null;
        const font =
            fonts.data?.find((item) => item.id === draft.headingFontId) ??
            (saved?.headingFont?.id === draft.headingFontId ? saved.headingFont : null);
        return font?.url ? { key: font.key, fallback: font.fallback, url: font.url } : null;
    }, [draft.headingFontId, fonts.data, saved]);

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.currentTarget;
        setDraft((current) => ({ ...current, [name]: name === 'key' ? normalizePresetKeyInput(value) : value }));
    }, []);

    // Back to the ink colour, the default.
    const handleUseInk = useCallback(() => {
        setDraft((current) => ({ ...current, titleColor: '' }));
    }, []);

    const handleEventTypeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const eventType = event.currentTarget.value as EventTypeConvention;
        setDraft((current) => ({ ...current, eventTypes: toggleEventType(current.eventTypes, eventType) }));
    }, []);

    const handleAvailabilityChange = useCallback((availability: ThemePresetAvailability) => {
        setDraft((current) => ({ ...current, archived: availability === 'ARCHIVED' }));
    }, []);

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
                    current = await create.mutateAsync(buildThemePresetCreatePayload(draft, sortOrder));
                    setSaved(current);
                } else {
                    const input = buildThemePresetPatchPayload(current, draft);
                    if (Object.keys(input).length > 0) {
                        current = await patch.mutateAsync({ id: current.id, input });
                        setSaved(current);
                    }
                }
                if (file) {
                    setSaved(await upload.mutateAsync({ id: current.id, file }));
                    setFile(null);
                }
                onDoneAction();
            } catch (error) {
                const classified = classifyError(error, current === null);
                if (classified.kind === 'notFound') void queryClient.invalidateQueries({ queryKey: adminThemePresetKeys.all });
                setFailure(classified);
            } finally {
                submitting.current = false;
            }
        },
        [create, draft, errors, file, onDoneAction, patch, queryClient, saved, sortOrder, upload],
    );

    return {
        isCreate,
        draft,
        errors: submitted ? errors : {},
        failure,
        fileError,
        hasPendingFile: file !== null,
        // <input type="color"> only takes a lower-case #rrggbb.
        colorInputValue: isHexColor(draft.backgroundColor) ? draft.backgroundColor.toLowerCase() : '#ffffff',
        availability: (draft.archived ? 'ARCHIVED' : 'AVAILABLE') as ThemePresetAvailability,
        // Ratio of the draft colour against the ink text; null while it isn't a valid colour.
        contrastRatio: isHexColor(draft.backgroundColor) ? inkContrastRatio(draft.backgroundColor) : null,
        previewColor: isHexColor(draft.backgroundColor) ? draft.backgroundColor : null,
        // The title colour against the background; null for the ink default or while either isn't a valid colour.
        titleContrastRatio:
            isHexColor(draft.titleColor) && isHexColor(draft.backgroundColor) ? contrastRatio(draft.titleColor, draft.backgroundColor) : null,
        // The picker shows the ink colour while the title uses it.
        titleColorInputValue: (isHexColor(draft.titleColor) ? draft.titleColor : INK_COLOR).toLowerCase(),
        previewTitleColor: isHexColor(draft.titleColor) ? draft.titleColor : null,
        previewFont,
        fontOptions,
        // Fonts a preset can newly take: live, with a file.
        hasUsableFonts: fonts.data?.some((font) => !font.archived && font.url) ?? false,
        fontsStatus: (fonts.isPending ? 'loading' : fonts.isError ? 'error' : 'ready') as ThemeFontsStatus,
        previewIllustrationUrl: filePreviewUrl ?? saved?.illustrationUrl ?? null,
        previewTitle: (locale === 'el' ? draft.nameEl : draft.nameEn).trim(),
        isSaving: create.isPending || patch.isPending || upload.isPending,
        handleFieldChange,
        handleUseInk,
        handleEventTypeChange,
        handleAvailabilityChange,
        handleFileChange,
        handleSubmit,
    };
}
