'use client';

import { Loader2, PencilLine, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useId, useMemo, useState } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { EventSessionRequestDto, EventSessionResponseDto } from '@/lib/api/types';
import { toDatetimeLocalValue } from '@/lib/datetime';

type SessionMutator = {
    mutateAsync: (payload: EventSessionRequestDto) => Promise<unknown>;
    isPending: boolean;
};

interface ScheduleEditorSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eventId: string;
    sessions: EventSessionResponseDto[];
    editingSession: EventSessionResponseDto | null;
    defaultStartAt: string;
    createSession: SessionMutator;
    updateSession: SessionMutator;
}

interface ScheduleEditorFormProps {
    eventId: string;
    sessions: EventSessionResponseDto[];
    editingSession: EventSessionResponseDto | null;
    defaultStartAt: string;
    createSession: SessionMutator;
    updateSession: SessionMutator;
    onClose: () => void;
}

function ScheduleEditorForm({ eventId, sessions, editingSession, defaultStartAt, createSession, updateSession, onClose }: ScheduleEditorFormProps) {
    const t = useTranslations('SchedulePage');
    const toErrorMessage = useApiErrorMessage();

    const initialTitle = editingSession?.title ?? '';
    const initialDescription = editingSession?.description ?? '';
    const initialStartAt = editingSession?.startAt ? toDatetimeLocalValue(editingSession.startAt) : defaultStartAt;
    const initialEndAt = editingSession?.endAt ? toDatetimeLocalValue(editingSession.endAt) : '';
    const initialLocationName = editingSession?.locationName ?? '';
    const initialMapsUrl = editingSession?.mapsUrl ?? '';

    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [startAt, setStartAt] = useState(initialStartAt);
    const [endAt, setEndAt] = useState(initialEndAt);
    const [locationName, setLocationName] = useState(initialLocationName);
    const [mapsUrl, setMapsUrl] = useState(initialMapsUrl);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const formId = useId();

    const nextDisplayOrder = useMemo(() => sessions.reduce((max, session) => Math.max(max, session.displayOrder), -1) + 1, [sessions]);
    const isEndBeforeStart = Boolean(startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime());

    function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
        setTitle(event.target.value);
    }

    function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
        setDescription(event.target.value);
    }

    function handleStartAtChange(event: ChangeEvent<HTMLInputElement>) {
        setStartAt(event.target.value);
    }

    function handleEndAtChange(event: ChangeEvent<HTMLInputElement>) {
        setEndAt(event.target.value);
    }

    function handleLocationNameChange(event: ChangeEvent<HTMLInputElement>) {
        setLocationName(event.target.value);
    }

    function handleMapsUrlChange(event: ChangeEvent<HTMLInputElement>) {
        setMapsUrl(event.target.value);
    }

    function resetToInitialValues() {
        setTitle(initialTitle);
        setDescription(initialDescription);
        setStartAt(initialStartAt);
        setEndAt(initialEndAt);
        setLocationName(initialLocationName);
        setMapsUrl(initialMapsUrl);
        setSubmitError(null);
        setSaved(false);
    }

    function handleSecondaryAction() {
        if (editingSession) {
            onClose();
            return;
        }

        resetToInitialValues();
    }

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;

        if (isEndBeforeStart) {
            setSubmitError(t('host.endBeforeStart'));
            setSaved(false);
            return;
        }

        setSubmitError(null);
        setSaved(false);

        const payload: EventSessionRequestDto = {
            eventId,
            title: trimmedTitle,
            displayOrder: editingSession?.displayOrder ?? nextDisplayOrder,
        };

        if (description.trim()) payload.description = description.trim();
        if (startAt) payload.startAt = new Date(startAt).toISOString();
        if (endAt) payload.endAt = new Date(endAt).toISOString();
        if (locationName.trim()) payload.locationName = locationName.trim();
        if (mapsUrl.trim()) payload.mapsUrl = mapsUrl.trim();

        try {
            if (editingSession) {
                await updateSession.mutateAsync(payload);
            } else {
                await createSession.mutateAsync(payload);
            }

            setSaved(true);
            onClose();
        } catch (error) {
            setSubmitError(toErrorMessage(error));
        }
    }

    const isSaving = createSession.isPending || updateSession.isPending;
    const submitLabel = editingSession
        ? updateSession.isPending
            ? t('host.updating')
            : t('host.update')
        : createSession.isPending
          ? t('host.submitting')
          : t('host.submit');

    return (
        <>
            <div className="border-b border-border/70 bg-background/95 px-4 py-4 backdrop-blur-sm sm:px-5">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border/70" aria-hidden="true" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                    {editingSession ? t('host.editingEyebrow') : t('host.eyebrow')}
                </p>
                <h2 className="mt-1 text-base font-semibold text-ink">{editingSession ? t('host.editingTitle') : t('host.title')}</h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted">
                    {editingSession ? t('host.editingSubtitle', { title: editingSession.title }) : t('host.subtitle')}
                </p>
            </div>

            <Modal.Body className="px-4 py-4 sm:px-5">
                <form id={formId} className="grid gap-4" onSubmit={handleSubmit}>
                    <FormFieldLabel
                        label={t('host.fields.title')}
                        required
                        className="grid gap-1.5"
                        labelClassName="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                    >
                        <input
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            placeholder={t('host.placeholders.title')}
                            required
                        />
                    </FormFieldLabel>

                    <FormFieldLabel
                        label={t('host.fields.description')}
                        optional
                        className="grid gap-1.5"
                        labelClassName="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                    >
                        <textarea
                            value={description}
                            onChange={handleDescriptionChange}
                            className="w-full min-h-24 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            placeholder={t('host.placeholders.description')}
                        />
                    </FormFieldLabel>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormFieldLabel
                            label={t('host.fields.startAt')}
                            optional
                            className="grid gap-1.5"
                            labelClassName="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                        >
                            <input
                                type="datetime-local"
                                value={startAt}
                                onChange={handleStartAtChange}
                                className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            />
                        </FormFieldLabel>
                        <FormFieldLabel
                            label={t('host.fields.endAt')}
                            optional
                            className="grid gap-1.5"
                            labelClassName="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                        >
                            <input
                                type="datetime-local"
                                value={endAt}
                                onChange={handleEndAtChange}
                                min={startAt || undefined}
                                className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                            />
                        </FormFieldLabel>
                    </div>

                    {isEndBeforeStart && <p className="text-xs font-medium text-rose-500">{t('host.endBeforeStart')}</p>}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormFieldLabel
                            label={t('host.fields.locationName')}
                            optional
                            className="grid gap-1.5"
                            labelClassName="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                        >
                            <input
                                type="text"
                                value={locationName}
                                onChange={handleLocationNameChange}
                                className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                                placeholder={t('host.placeholders.locationName')}
                            />
                        </FormFieldLabel>
                        <FormFieldLabel
                            label={t('host.fields.mapsUrl')}
                            optional
                            className="grid gap-1.5"
                            labelClassName="text-xs font-semibold uppercase tracking-wide text-ink-muted"
                        >
                            <input
                                type="url"
                                value={mapsUrl}
                                onChange={handleMapsUrlChange}
                                className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                                placeholder={t('host.placeholders.mapsUrl')}
                            />
                        </FormFieldLabel>
                    </div>

                    {submitError && <p className="text-xs font-medium text-rose-500">{submitError}</p>}
                    {saved && !submitError && <p className="text-xs font-medium text-emerald-600">{t('saved')}</p>}
                </form>
            </Modal.Body>

            <div className="border-t border-border/70 bg-background/95 px-4 py-4 backdrop-blur-sm sm:px-5">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSecondaryAction}
                        className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70"
                    >
                        {editingSession ? <X className="h-4 w-4" /> : null}
                        {editingSession ? t('host.cancelEdit') : t('host.reset')}
                    </button>
                    <button
                        type="submit"
                        form={formId}
                        disabled={isSaving}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {editingSession ? (
                            updateSession.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <PencilLine className="h-4 w-4" />
                            )
                        ) : createSession.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}
                        {submitLabel}
                    </button>
                </div>
            </div>
        </>
    );
}

export function ScheduleEditorSheet({
    open,
    onOpenChange,
    eventId,
    sessions,
    editingSession,
    defaultStartAt,
    createSession,
    updateSession,
}: ScheduleEditorSheetProps) {
    const t = useTranslations('SchedulePage');

    function handleClose() {
        onOpenChange(false);
    }

    const sheetKey = `${editingSession?.id ?? 'new'}-${defaultStartAt}`;

    return (
        <Modal open={open} onClose={handleClose} size="md" variant="sheet" closeLabel={t('host.cancelEdit')} className="sm:max-w-2xl">
            {open && (
                <ScheduleEditorForm
                    key={sheetKey}
                    eventId={eventId}
                    sessions={sessions}
                    editingSession={editingSession}
                    defaultStartAt={defaultStartAt}
                    createSession={createSession}
                    updateSession={updateSession}
                    onClose={handleClose}
                />
            )}
        </Modal>
    );
}
