'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    adminQrCardTemplateKeys,
    useCreateQrCardTemplate,
    useDuplicateQrCardTemplate,
    usePatchQrCardTemplate,
} from '@/hooks/useAdminQrCardTemplates';
import {
    buildQrCardTemplateCreatePayload,
    buildQrCardTemplatePatchPayload,
    draftFromQrCardTemplate,
    type QrCardTemplateDraft,
    validateQrCardTemplateDraft,
} from '@/lib/adminQrCards';
import { toggleEventType } from '@/lib/adminThemePresets';
import { isNotFoundError } from '@/lib/api/errors';
import type { AdminQrCardTemplateDto, EventTypeConvention } from '@/lib/api/types';
import { resolveLocalizedText } from '@/lib/localizedText';
import { PLAIN_QR_CARD_STYLE, type QrCardStyle } from '@/lib/qrCard';
import { qrCardLayoutOf } from '@/lib/qrCardLayout';

export type QrCardTemplateDrawerError = { kind: 'notFound' } | { kind: 'other'; error: unknown };
export type QrCardTemplateAvailability = 'AVAILABLE' | 'ARCHIVED';

// 404 means another admin's change removed the design from under this drawer.
function classifyError(error: unknown): QrCardTemplateDrawerError {
    if (isNotFoundError(error)) return { kind: 'notFound' };
    return { kind: 'other', error };
}

// The side panel edits a design's names, event types and availability; its look and layout are the layout
// editor's. A new design opens the layout editor as soon as it's created. onDuplicatedAction: the copy was
// made; the caller opens it.
export function useQrCardTemplateDrawer({
    template,
    sortOrder,
    onDoneAction,
    onDuplicatedAction,
}: {
    template: AdminQrCardTemplateDto | null;
    sortOrder: number;
    onDoneAction: () => void;
    onDuplicatedAction: (copy: AdminQrCardTemplateDto) => void;
}) {
    const locale = useLocale();
    const queryClient = useQueryClient();
    const create = useCreateQrCardTemplate();
    const patch = usePatchQrCardTemplate();
    const duplicateMutation = useDuplicateQrCardTemplate();

    // After a create the drawer edits the new design, so a second save patches it instead of creating it twice.
    const [saved, setSaved] = useState<AdminQrCardTemplateDto | null>(template);
    const isCreate = saved === null;
    const [draft, setDraft] = useState<QrCardTemplateDraft>(() => draftFromQrCardTemplate(template));
    const [submitted, setSubmitted] = useState(false);
    const [failure, setFailure] = useState<QrCardTemplateDrawerError | null>(null);
    // Set synchronously: a fast double click submits twice before isSaving re-renders.
    const submitting = useRef(false);
    // Cleared on unmount: a save still in flight then never calls onDoneAction, which would otherwise act
    // on whatever drawer is open by then.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const errors = useMemo(() => validateQrCardTemplateDraft(draft), [draft]);

    // The saved look and layout; a design not yet created shows as Plain.
    const previewStyle = useMemo<QrCardStyle>(
        () =>
            saved
                ? {
                      id: saved.id,
                      artworkUrl: saved.artworkUrl,
                      textColor: saved.textColor,
                      headingFont: saved.headingFont?.url
                          ? { key: saved.headingFont.key, fallback: saved.headingFont.fallback, url: saved.headingFont.url }
                          : null,
                      codeColor: saved.codeColor,
                      centerLogo: saved.centerLogo,
                      layout: qrCardLayoutOf(saved.layout),
                      // The preview never prints, so its sizes don't matter.
                      sizes: ['A6'],
                  }
                : PLAIN_QR_CARD_STYLE,
        [saved],
    );

    const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
    const openLayoutEditor = useCallback(() => setLayoutEditorOpen(true), []);
    const closeLayoutEditor = useCallback(() => setLayoutEditorOpen(false), []);
    // The editor saved the look or layout: the drawer's copy follows, so its preview shows it.
    const handleLayoutSaved = useCallback((updated: AdminQrCardTemplateDto) => setSaved(updated), []);

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.currentTarget;
        setDraft((current) => ({ ...current, [name]: value }));
    }, []);

    const handleEventTypeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const eventType = event.currentTarget.value as EventTypeConvention;
        setDraft((current) => ({ ...current, eventTypes: toggleEventType(current.eventTypes, eventType) }));
    }, []);

    const handleAvailabilityChange = useCallback((availability: QrCardTemplateAvailability) => {
        setDraft((current) => ({ ...current, archived: availability === 'ARCHIVED' }));
    }, []);

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            setFailure(null);
            if (Object.keys(errors).length > 0 || submitting.current) return;
            submitting.current = true;

            try {
                if (saved === null) {
                    const created = await create.mutateAsync(buildQrCardTemplateCreatePayload(draft, sortOrder));
                    if (!mounted.current) return;
                    // Its look and layout come next, in the editor.
                    setSaved(created);
                    setLayoutEditorOpen(true);
                    return;
                }
                const input = buildQrCardTemplatePatchPayload(saved, draft);
                if (Object.keys(input).length > 0) {
                    const updated = await patch.mutateAsync({ id: saved.id, input });
                    if (!mounted.current) return;
                    setSaved(updated);
                }
                onDoneAction();
            } catch (error) {
                if (!mounted.current) return;
                const classified = classifyError(error);
                if (classified.kind === 'notFound') void queryClient.invalidateQueries({ queryKey: adminQrCardTemplateKeys.all });
                setFailure(classified);
            } finally {
                submitting.current = false;
            }
        },
        [create, draft, errors, onDoneAction, patch, queryClient, saved, sortOrder],
    );

    // The copy is of the saved design, so unsaved changes must be saved first.
    const hasUnsavedChanges = saved !== null && Object.keys(buildQrCardTemplatePatchPayload(saved, draft)).length > 0;
    const duplicate = useCallback(async () => {
        if (saved === null || submitting.current) return;
        submitting.current = true;
        setFailure(null);
        try {
            const copy = await duplicateMutation.mutateAsync(saved.id);
            if (mounted.current) onDuplicatedAction(copy);
        } catch (error) {
            if (mounted.current) setFailure(classifyError(error));
        } finally {
            submitting.current = false;
        }
    }, [duplicateMutation, onDuplicatedAction, saved]);

    return {
        isCreate,
        // The saved design's name, for the heading once a create has gone through.
        savedName: resolveLocalizedText(saved?.name, locale),
        draft,
        errors: submitted ? errors : {},
        failure,
        availability: (draft.archived ? 'ARCHIVED' : 'AVAILABLE') as QrCardTemplateAvailability,
        previewStyle,
        previewTitle: (locale === 'el' ? draft.nameEl : draft.nameEn).trim(),
        savedTemplate: saved,
        layoutEditorOpen,
        openLayoutEditor,
        closeLayoutEditor,
        handleLayoutSaved,
        isSaving: create.isPending || patch.isPending || duplicateMutation.isPending,
        isDuplicating: duplicateMutation.isPending,
        hasUnsavedChanges,
        duplicate,
        handleFieldChange,
        handleEventTypeChange,
        handleAvailabilityChange,
        handleSubmit,
    };
}
