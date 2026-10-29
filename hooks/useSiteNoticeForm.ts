'use client';

import { type ChangeEvent, useState } from 'react';

import { useCreateSiteNotice, useDeleteSiteNotice, useUpdateSiteNotice } from '@/hooks/useAdminSiteNotices';
import type { AdminSiteNoticeDto, SiteNoticeTone } from '@/lib/api/types';
import {
    type ChoosableArea,
    EMPTY_SITE_NOTICE_FORM,
    formOfNotice,
    requestOfForm,
    type SiteNoticeForm,
    siteNoticeFormProblem,
} from '@/lib/siteNoticeForm';

type TextField = 'messageEn' | 'messageEl' | 'linkUrl' | 'linkLabelEn' | 'linkLabelEl';
export type PreviewLocale = 'en' | 'el';

// The site notice drawer's state and actions. The drawer is remounted on every opening, so the
// form starts from the notice's saved values (or the empty form).
export function useSiteNoticeForm(notice: AdminSiteNoticeDto | null, onDone: () => void) {
    const create = useCreateSiteNotice();
    const update = useUpdateSiteNotice();
    const remove = useDeleteSiteNotice();
    const [form, setForm] = useState<SiteNoticeForm>(() => (notice ? formOfNotice(notice) : EMPTY_SITE_NOTICE_FORM));
    const [previewLocale, setPreviewLocale] = useState<PreviewLocale>('en');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<unknown>(null);
    // The problem shows only after a save attempt, so an empty new form isn't flagged at once.
    const [showProblem, setShowProblem] = useState(false);

    const problem = siteNoticeFormProblem(form);
    const busy = create.isPending || update.isPending || remove.isPending;
    const hasLink = form.linkUrl.trim() !== '';
    const previewMessage = previewLocale === 'en' ? form.messageEn : form.messageEl;
    const previewLinkLabel = previewLocale === 'en' ? form.linkLabelEn : form.linkLabelEl;

    function handleTextChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const field = event.currentTarget.name as TextField;
        const value = event.currentTarget.value;
        setForm((current) => ({ ...current, [field]: value }));
    }

    function setTone(tone: SiteNoticeTone) {
        setForm((current) => ({ ...current, tone }));
    }

    function setWhere(where: SiteNoticeForm['where']) {
        setForm((current) => ({ ...current, where }));
    }

    function toggleArea(area: ChoosableArea) {
        setForm((current) => ({
            ...current,
            areas: current.areas.includes(area) ? current.areas.filter((item) => item !== area) : [...current.areas, area],
        }));
    }

    function setDismissible(dismissible: boolean) {
        setForm((current) => ({ ...current, dismissible }));
    }

    function setActive(active: boolean) {
        setForm((current) => ({ ...current, active }));
    }

    function setStartsAt(startsAt: string) {
        setForm((current) => ({ ...current, startsAt }));
    }

    function setEndsAt(endsAt: string) {
        setForm((current) => ({ ...current, endsAt }));
    }

    async function save() {
        if (problem) {
            setShowProblem(true);
            return;
        }
        setError(null);
        try {
            const input = requestOfForm(form);
            if (notice) await update.mutateAsync({ id: notice.id, input });
            else await create.mutateAsync(input);
            onDone();
        } catch (caught) {
            setError(caught);
        }
    }

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        void save();
    }

    function openDeleteConfirmation() {
        setConfirmDelete(true);
    }

    function closeDeleteConfirmation() {
        setConfirmDelete(false);
    }

    async function confirmDeletion() {
        if (!notice) return;
        setError(null);
        try {
            await remove.mutateAsync(notice.id);
            setConfirmDelete(false);
            onDone();
        } catch (caught) {
            setConfirmDelete(false);
            setError(caught);
        }
    }

    return {
        form,
        problem: showProblem ? problem : null,
        busy,
        deleting: remove.isPending,
        error,
        hasLink,
        previewLocale,
        previewMessage,
        previewLinkLabel,
        setPreviewLocale,
        confirmDelete,
        openDeleteConfirmation,
        closeDeleteConfirmation,
        confirmDeletion,
        handleTextChange,
        handleSubmit,
        setTone,
        setWhere,
        toggleArea,
        setDismissible,
        setActive,
        setStartsAt,
        setEndsAt,
    };
}
