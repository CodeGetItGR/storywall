'use client';

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCreateFontPairing, usePatchFontPairing } from '@/hooks/useAdminFontPairings';
import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useAdminThemeFonts } from '@/hooks/useAdminThemeFonts';
import {
    type AdminFontPairingDto,
    buildFontPairingCreate,
    buildFontPairingPatch,
    draftFromPairing,
    type FontPairingDraft,
    fontPairingFontOptions,
    matchingFontValue,
    validateFontPairingDraft,
} from '@/lib/adminFontPairings';
import { uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';
import { toggleEventType } from '@/lib/saveMyDateEventTypes';

export type FontPairingVisibility = 'SHOWN' | 'HIDDEN';
type FontField = 'titleFont' | 'bodyFont' | 'buttonFont';

// One pairing's drawer: the draft, its checks, the font lists and the save.
// `createSortOrder` puts a new pairing last in the list.
export function useFontPairingDrawer({
    pairing,
    createSortOrder,
    onDoneAction,
}: {
    pairing: AdminFontPairingDto | null;
    createSortOrder: number;
    onDoneAction: () => void;
}) {
    const create = useCreateFontPairing();
    const patch = usePatchFontPairing();
    const uploadedQuery = useAdminThemeFonts('INVITATION');
    // The files of every Save my date font, for the preview.
    const filesQuery = useInvitationFonts(true);

    const [draft, setDraft] = useState<FontPairingDraft>(() => draftFromPairing(pairing));
    const [submitted, setSubmitted] = useState(false);
    const [failure, setFailure] = useState<unknown>(null);
    // Set synchronously: a fast double click submits twice before isPending re-renders.
    const submitting = useRef(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const savedFonts = useMemo(() => (pairing ? [pairing.titleFont, pairing.bodyFont, pairing.buttonFont ?? ''] : []), [pairing]);
    const fontOptions = useMemo(() => fontPairingFontOptions(uploadedQuery.data ?? [], savedFonts), [savedFonts, uploadedQuery.data]);
    const errors = useMemo(() => validateFontPairingDraft(draft), [draft]);
    const previewCss = useMemo(
        () => uploadedFontFaceCss(filesQuery.data ?? [], [draft.titleFont, draft.bodyFont, draft.buttonFont]),
        [draft.bodyFont, draft.buttonFont, draft.titleFont, filesQuery.data],
    );

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const name = event.currentTarget.value;
        setDraft((current) => ({ ...current, name }));
    }, []);

    const handleFontChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        const field = event.currentTarget.name as FontField;
        const value = event.currentTarget.value;
        setDraft((current) => ({ ...current, [field]: value }));
    }, []);

    const handleEventTypeChange = useCallback((key: string, checked: boolean) => {
        setDraft((current) => ({ ...current, eventTypes: toggleEventType(current.eventTypes, key, checked) }));
    }, []);

    const handleVisibilityChange = useCallback((visibility: FontPairingVisibility) => {
        setDraft((current) => ({ ...current, hidden: visibility === 'HIDDEN' }));
    }, []);

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            setFailure(null);
            if (Object.keys(errors).length > 0 || submitting.current) return;
            submitting.current = true;
            try {
                if (pairing === null) {
                    await create.mutateAsync(buildFontPairingCreate(draft, createSortOrder));
                } else {
                    const input = buildFontPairingPatch(pairing, draft);
                    if (Object.keys(input).length > 0) await patch.mutateAsync({ id: pairing.id, input });
                }
                if (mounted.current) onDoneAction();
            } catch (error) {
                if (mounted.current) setFailure(error);
            } finally {
                submitting.current = false;
            }
        },
        [create, createSortOrder, draft, errors, onDoneAction, pairing, patch],
    );

    return {
        isCreate: pairing === null,
        draft,
        errors: submitted ? errors : {},
        failure,
        fontOptions,
        // The select shows the option a stored value matches.
        selectedFont: {
            titleFont: matchingFontValue(fontOptions, draft.titleFont),
            bodyFont: matchingFontValue(fontOptions, draft.bodyFont),
            buttonFont: matchingFontValue(fontOptions, draft.buttonFont),
        },
        // Buttons use the text font when no button font is set.
        previewButtonFont: draft.buttonFont || draft.bodyFont,
        previewCss,
        visibility: (draft.hidden ? 'HIDDEN' : 'SHOWN') as FontPairingVisibility,
        isSaving: create.isPending || patch.isPending,
        handleNameChange,
        handleFontChange,
        handleEventTypeChange,
        handleVisibilityChange,
        handleSubmit,
    };
}
