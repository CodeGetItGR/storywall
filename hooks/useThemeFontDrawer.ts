'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { adminThemeFontKeys, useCreateThemeFont, usePatchThemeFont, useUploadThemeFontFile } from '@/hooks/useAdminThemeFonts';
import {
    buildThemeFontCreate,
    buildThemeFontPatch,
    draftFromFont,
    fontFileError,
    type ThemeFontDraft,
    type ThemeFontFallback,
    validateThemeFontDraft,
} from '@/lib/adminThemeFonts';
import { normalizePresetKeyInput } from '@/lib/adminThemePresets';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode, getFieldErrors, isNotFoundError } from '@/lib/api/errors';
import type { AdminThemeFontDto } from '@/lib/api/types';
import { isThemeFontUrl } from '@/lib/eventTheme';

export type ThemeFontDrawerError =
    { kind: 'keyTaken' } | { kind: 'keyInvalid' } | { kind: 'familyNameInvalid' } | { kind: 'notFound' } | { kind: 'other'; error: unknown };
export type ThemeFontAvailability = 'AVAILABLE' | 'ARCHIVED';

type SaveStep = 'create' | 'patch' | 'upload';

// 409 on create is a taken key (5146), shown on the key field. A 3001 on create/PATCH is about the
// key (its field error) or the display name (the only other field the admin types), so it goes on
// that field too, as does 3095, the display name's own code. 404 means the font is gone from under
// this drawer.
function classifyError(error: unknown, step: SaveStep): ThemeFontDrawerError {
    if (step === 'create' && error instanceof ApiError && error.status === 409) return { kind: 'keyTaken' };
    if (step !== 'upload' && getErrorCode(error) === ERROR_CODES.THEME_FONT_FAMILY_NAME_INVALID) return { kind: 'familyNameInvalid' };
    if (step !== 'upload' && getErrorCode(error) === ERROR_CODES.VALIDATION_FAILED) {
        const fields = getFieldErrors(error) ?? {};
        if (fields.key) return { kind: 'keyInvalid' };
        if (fields.familyName || Object.keys(fields).length === 0) return { kind: 'familyNameInvalid' };
    }
    if (isNotFoundError(error)) return { kind: 'notFound' };
    return { kind: 'other', error };
}

let previewCount = 0;

// A family name of its own per loaded file, so a replaced file never shows through the old face.
function nextPreviewFamily(): string {
    previewCount += 1;
    return `theme-preview-${previewCount}`;
}

type PreviewSource = File | string;
type PreviewState = { source: PreviewSource; family: string | null; failed: boolean };
// 'file': a picked file the browser can't read. 'saved': the uploaded file didn't load.
export type ThemeFontPreviewFailure = 'file' | 'saved' | null;

// Loads the font with the FontFace API. A picked file is read as bytes, which fetches nothing, so
// CSP doesn't apply; the saved file is a same-origin url. The face is removed again when the source
// changes and on unmount.
function useFontPreview(source: PreviewSource | null): { family: string | null; failed: ThemeFontPreviewFailure } {
    const [state, setState] = useState<PreviewState | null>(null);

    useEffect(() => {
        if (source === null || typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) return;
        let cancelled = false;
        let face: FontFace | null = null;
        const family = nextPreviewFamily();

        async function load(current: PreviewSource) {
            try {
                const data = typeof current === 'string' ? `url(${JSON.stringify(current)})` : await current.arrayBuffer();
                if (cancelled) return;
                const loading = new FontFace(family, data);
                await loading.load();
                if (cancelled) return;
                face = loading;
                document.fonts.add(loading);
                setState({ source: current, family, failed: false });
            } catch {
                // Not a font the browser can read (corrupt, or not really a font): say so, don't throw.
                if (!cancelled) setState({ source: current, family: null, failed: true });
            }
        }

        void load(source);
        return () => {
            cancelled = true;
            if (face) document.fonts.delete(face);
        };
    }, [source]);

    // A result for an earlier source is stale.
    if (!state || state.source !== source) return { family: null, failed: null };
    return { family: state.family, failed: state.failed ? (typeof state.source === 'string' ? 'saved' : 'file') : null };
}

export function useThemeFontDrawer({ font, onDoneAction }: { font: AdminThemeFontDto | null; onDoneAction: () => void }) {
    const queryClient = useQueryClient();
    const create = useCreateThemeFont();
    const patch = usePatchThemeFont();
    const upload = useUploadThemeFontFile();

    // After a create the drawer edits the new font, so retrying a failed upload doesn't create it again.
    const [saved, setSaved] = useState<AdminThemeFontDto | null>(font);
    const isCreate = saved === null;
    const [draft, setDraft] = useState<ThemeFontDraft>(() => draftFromFont(font));
    const [submitted, setSubmitted] = useState(false);
    const [failure, setFailure] = useState<ThemeFontDrawerError | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<'type' | 'size' | null>(null);
    // A pick whose bytes are still being read: Save waits, so it never uploads the file this replaces.
    const [checkingFile, setCheckingFile] = useState(false);
    const checking = useRef(false);
    // Each pick is numbered: a check that finishes after a later pick doesn't overwrite it.
    const pickCount = useRef(0);
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

    // Only a path the font route serves is loaded; anything else gets no preview.
    const savedUrl = saved?.url && isThemeFontUrl(saved.url, saved.key) ? saved.url : null;
    const preview = useFontPreview(file ?? savedUrl);

    // A saved file that doesn't load is likely stale (a newer upload bumped the version): refetch.
    useEffect(() => {
        if (preview.failed === 'saved') void queryClient.invalidateQueries({ queryKey: adminThemeFontKeys.all });
    }, [preview.failed, queryClient]);
    const errors = useMemo(() => validateThemeFontDraft(draft, isCreate), [draft, isCreate]);

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.currentTarget;
        setDraft((current) => ({ ...current, [name]: name === 'key' ? normalizePresetKeyInput(value) : value }));
    }, []);

    const handleFallbackChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const fallback = event.currentTarget.value as ThemeFontFallback;
        setDraft((current) => ({ ...current, fallback }));
    }, []);

    const handleAvailabilityChange = useCallback((availability: ThemeFontAvailability) => {
        setDraft((current) => ({ ...current, archived: availability === 'ARCHIVED' }));
    }, []);

    const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const next = event.currentTarget.files?.[0] ?? null;
        // Lets the same file be picked again after a refusal.
        event.currentTarget.value = '';
        if (!next) return;
        const pick = ++pickCount.current;
        checking.current = true;
        setCheckingFile(true);
        setFile(null);
        const problem = await fontFileError(next);
        if (pick !== pickCount.current || !mounted.current) return;
        checking.current = false;
        setCheckingFile(false);
        setFileError(problem);
        // A refused pick also drops the earlier one, so Save never uploads a file the admin replaced.
        setFile(problem ? null : next);
    }, []);

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            setFailure(null);
            if (Object.keys(errors).length > 0 || submitting.current || checking.current) return;
            submitting.current = true;

            let current = saved;
            let step: SaveStep = current === null ? 'create' : 'patch';
            try {
                if (current === null) {
                    current = await create.mutateAsync(buildThemeFontCreate(draft));
                    if (!mounted.current) return;
                    setSaved(current);
                } else {
                    const input = buildThemeFontPatch(current, draft);
                    if (Object.keys(input).length > 0) {
                        current = await patch.mutateAsync({ id: current.id, input });
                        setSaved(current);
                    }
                }
                if (!mounted.current) return;
                if (file) {
                    step = 'upload';
                    setSaved(await upload.mutateAsync({ id: current.id, file }));
                    setFile(null);
                }
                if (!mounted.current) return;
                onDoneAction();
            } catch (error) {
                if (!mounted.current) return;
                const classified = classifyError(error, step);
                if (classified.kind === 'notFound' || classified.kind === 'keyTaken')
                    void queryClient.invalidateQueries({ queryKey: adminThemeFontKeys.all });
                setFailure(classified);
            } finally {
                submitting.current = false;
            }
        },
        [create, draft, errors, file, onDoneAction, patch, queryClient, saved, upload],
    );

    return {
        isCreate,
        draft,
        errors: submitted ? errors : {},
        failure,
        fileError,
        hasPendingFile: file !== null,
        isCheckingFile: checkingFile,
        pendingFileName: file?.name ?? null,
        // This drawer created the font but its file didn't go up: saving again only uploads.
        createdWithoutFile: font === null && saved !== null && file !== null && failure !== null,
        availability: (draft.archived ? 'ARCHIVED' : 'AVAILABLE') as ThemeFontAvailability,
        previewFamily: preview.family,
        previewFailed: preview.failed,
        presetCount: saved?.presetCount ?? 0,
        isSaving: create.isPending || patch.isPending || upload.isPending,
        handleFieldChange,
        handleFallbackChange,
        handleAvailabilityChange,
        handleFileChange,
        handleSubmit,
    };
}
