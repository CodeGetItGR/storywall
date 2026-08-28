'use client';

import { Calendar, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ScheduleEditorSheet } from '@/app/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorSheet';
import { ScheduleEmptyState } from '@/app/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEmptyState';
import { ScheduleSessionsList } from '@/app/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleSessionsList';
import { EventRouteSpinner, useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateEventSession, useDeleteEventSession, useEventSessions, useUpdateEventSession } from '@/hooks/useEventSessions';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { toDatetimeLocalValue } from '@/lib/datetime';
import { isEventWritable } from '@/lib/eventLifecycle';

export function ScheduleScreen() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const t = useTranslations('SchedulePage');
    const tCreateEvent = useTranslations('CreateEventPage');
    const toErrorMessage = useApiErrorMessage();
    const locale = useLocale();
    const router = useRouter();
    const canWrite = isEventWritable(activeEvent?.status);
    const canManageSchedule = isHost && canWrite;

    const { data: sessions = [], isLoading: isLoadingSessions } = useEventSessions(eventId);
    const createSession = useCreateEventSession();
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [creatingSecondary, setCreatingSecondary] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<EventSessionResponseDto | null>(null);
    const updateSession = useUpdateEventSession(editingSessionId ?? '', eventId ?? '');
    const deleteSession = useDeleteEventSession(eventId ?? '');

    const defaultStartAt = activeEvent ? toDatetimeLocalValue(activeEvent.schedule.startAt) : '';
    const editingSession = useMemo(
        () => (editingSessionId ? (sessions.find((session) => session.id === editingSessionId) ?? null) : null),
        [editingSessionId, sessions]
    );

    const secondarySessionTitleKey = activeEvent ? getCreateEventCatalogEntry(activeEvent.eventType)?.secondarySessionTitleKey : undefined;
    const secondarySessionTitle =
        secondarySessionTitleKey && tCreateEvent.has(secondarySessionTitleKey) ? tCreateEvent(secondarySessionTitleKey) : undefined;
    const hasSecondarySession = sessions.some((session) => session.isSecondary);
    const canAddSecondarySession = canManageSchedule && Boolean(secondarySessionTitle) && !hasSecondarySession;

    function handleBack() {
        router.back();
    }

    function openCreateEditor() {
        if (!canManageSchedule) return;
        setDeleteError(null);
        setEditingSessionId(null);
        setCreatingSecondary(false);
        setEditorOpen(true);
    }

    function openCreateSecondaryEditor() {
        if (!canAddSecondarySession) return;
        setDeleteError(null);
        setEditingSessionId(null);
        setCreatingSecondary(true);
        setEditorOpen(true);
    }

    function beginEditSession(session: EventSessionResponseDto) {
        if (!canManageSchedule) return;
        setDeleteError(null);
        setEditingSessionId(session.id);
        setCreatingSecondary(false);
        setEditorOpen(true);
    }

    function closeEditor() {
        setEditorOpen(false);
        setEditingSessionId(null);
        setCreatingSecondary(false);
    }

    function handleEditorOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            closeEditor();
            return;
        }

        if (canManageSchedule) setEditorOpen(true);
    }

    async function handleDeleteSession(session: EventSessionResponseDto) {
        if (!canManageSchedule) return;
        setDeleteError(null);
        setDeleteTarget(session);
    }

    async function confirmDeleteSession() {
        if (!deleteTarget || !canManageSchedule) return;

        const session = deleteTarget;
        setDeleteTarget(null);

        try {
            await deleteSession.mutateAsync(session.id);
            if (editingSessionId === session.id) {
                closeEditor();
            }
        } catch (error) {
            setDeleteError(toErrorMessage(error));
        }
    }

    function handleCloseDeleteSessionConfirm() {
        setDeleteTarget(null);
    }

    if (isLoadingSessions) return <EventRouteSpinner />;

    return (
        <ModulePageShell
            title={t('title')}
            icon={Calendar}
            iconClassName="text-amber-500"
            backLabel={t('back')}
            onBack={handleBack}
            subtitle={t('subtitle')}
            action={
                canManageSchedule && sessions.length > 0 ? (
                    <div className="flex items-center gap-2">
                        {canAddSecondarySession && (
                            <button
                                type="button"
                                onClick={openCreateSecondaryEditor}
                                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 px-3.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('host.addSecondarySession', { title: secondarySessionTitle ?? '' })}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={openCreateEditor}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-brand px-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('host.submit')}</span>
                        </button>
                    </div>
                ) : undefined
            }
            notice={isHost && !canWrite ? <ModuleNotice>{t('host.readOnly')}</ModuleNotice> : undefined}
        >
            {deleteError && <p className="mb-4 text-xs font-medium text-rose-500">{deleteError}</p>}

            {sessions.length === 0 ? (
                <ScheduleEmptyState isHost={isHost} canWrite={canWrite} canAddSession={canManageSchedule} onAddSession={openCreateEditor} />
            ) : (
                <ScheduleSessionsList
                    sessions={sessions}
                    editingSessionId={editingSessionId}
                    isHost={isHost}
                    locale={locale}
                    onEdit={beginEditSession}
                    onDelete={handleDeleteSession}
                    deleteDisabled={deleteSession.isPending || !canManageSchedule}
                    canManage={canManageSchedule}
                />
            )}

            {canManageSchedule && (
                <ScheduleEditorSheet
                    open={editorOpen}
                    onOpenChange={handleEditorOpenChange}
                    eventId={eventId ?? ''}
                    eventStatus={activeEvent.status}
                    sessions={sessions}
                    editingSession={editingSession}
                    defaultStartAt={defaultStartAt ?? ''}
                    createSession={createSession}
                    updateSession={updateSession}
                    secondaryPrefillTitle={creatingSecondary ? secondarySessionTitle : undefined}
                />
            )}

            <ConfirmActionModal
                open={Boolean(deleteTarget)}
                onCloseAction={handleCloseDeleteSessionConfirm}
                onConfirmAction={confirmDeleteSession}
                title={deleteTarget ? t('host.deleteSession', { title: deleteTarget.title }) : ''}
                body={deleteTarget ? t('host.deleteConfirm', { title: deleteTarget.title }) : ''}
                confirmLabel={t('host.deleteSession', { title: '' }).trim()}
                cancelLabel={t('host.cancelEdit')}
                isConfirming={deleteSession.isPending}
            />
        </ModulePageShell>
    );
}
