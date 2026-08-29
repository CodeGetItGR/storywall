'use client';

import { Calendar } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ScheduleEditorSheet } from '@/app/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorSheet';
import { ScheduleEmptyState } from '@/app/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEmptyState';
import { ScheduleSessionsList } from '@/app/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleSessionsList';
import { EventRouteSpinner, useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ScheduleEditSessionsTable } from '@/components/schedule/ScheduleEditSessionsTable';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateEventSession, useDeleteEventSession, useEventSessions, useUpdateEventSession } from '@/hooks/useEventSessions';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';
import { toDatetimeLocalValue } from '@/lib/datetime';
import { isEventWritable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import type { ManagedSessionDefinition } from '@/lib/sessionManagement';
import { cn } from '@/lib/utils';

export function ScheduleScreen() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const t = useTranslations('SchedulePage');
    const tCreateEvent = useTranslations('CreateEventPage');
    const toErrorMessage = useApiErrorMessage();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const canWrite = isEventWritable(activeEvent?.status);
    const canManageSchedule = isHost && canWrite;

    const { data: sessions = [], isLoading: isLoadingSessions } = useEventSessions(eventId);
    const createSession = useCreateEventSession();
    const [viewMode, setViewMode] = useState<'public' | 'edit'>(() => (isHost && searchParams.has('section') ? 'edit' : 'public'));
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

    function openCreateEditor() {
        if (!canManageSchedule) return;
        setDeleteError(null);
        setEditingSessionId(null);
        setCreatingSecondary(false);
        setEditorOpen(true);
    }

    function openCreateManagedEditor(definition: ManagedSessionDefinition) {
        if (!canManageSchedule || !definition.canCreate) return;
        const secondarySessionTitleKey = activeEvent ? getCreateEventCatalogEntry(activeEvent.eventType)?.secondarySessionTitleKey : undefined;
        setDeleteError(null);
        setEditingSessionId(null);
        setCreatingSecondary(Boolean(secondarySessionTitleKey && definition.role === 'secondary'));
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

    function showPublicView() {
        setViewMode('public');
    }

    function showEditView() {
        setViewMode('edit');
    }

    if (isLoadingSessions) return <EventRouteSpinner />;

    const secondarySessionTitleKey = activeEvent ? getCreateEventCatalogEntry(activeEvent.eventType)?.secondarySessionTitleKey : undefined;
    const secondarySessionTitle =
        secondarySessionTitleKey && tCreateEvent.has(secondarySessionTitleKey) ? tCreateEvent(secondarySessionTitleKey) : undefined;

    return (
        <ModulePageShell
            title={t('title')}
            icon={Calendar}
            iconClassName="text-amber-500"
            backLabel={t('back')}
            backHref={routes.events.feed(eventId)}
            subtitle={t('subtitle')}
            notice={isHost && !canWrite ? <ModuleNotice>{t('host.readOnly')}</ModuleNotice> : undefined}
        >
            {deleteError && <p className="mb-4 text-xs font-medium text-rose-500">{deleteError}</p>}

            {isHost && (
                <div className="mb-5 flex rounded-full bg-surface-muted p-1 mx-auto w-fit">
                    <button
                        type="button"
                        onClick={showEditView}
                        className={cn(
                            'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                            viewMode === 'edit' ? 'bg-background text-ink shadow-sm' : 'text-ink-muted'
                        )}
                    >
                        {t('views.edit')}
                    </button>
                    <button
                        type="button"
                        onClick={showPublicView}
                        className={cn(
                            'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                            viewMode === 'public' ? 'bg-background text-ink shadow-sm' : 'text-ink-muted'
                        )}
                    >
                        {t('views.public')}
                    </button>
                </div>
            )}

            {activeEvent && isHost && viewMode === 'edit' ? (
                <ScheduleEditSessionsTable
                    event={activeEvent}
                    sessions={sessions}
                    canWrite={canManageSchedule}
                    deleteDisabled={deleteSession.isPending || !canManageSchedule}
                    onAddSession={openCreateEditor}
                    onCreateManagedSession={openCreateManagedEditor}
                    onEditSession={beginEditSession}
                    onDeleteSession={handleDeleteSession}
                />
            ) : sessions.length === 0 ? (
                <ScheduleEmptyState isHost={isHost} canWrite={canWrite} canAddSession={canManageSchedule} onAddSession={openCreateEditor} />
            ) : (
                <ScheduleSessionsList sessions={sessions} locale={locale} />
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
                body={deleteTarget ? t('host.deleteConfirm') : ''}
                confirmLabel={t('host.deleteSession', { title: '' }).trim()}
                cancelLabel={t('host.cancel')}
                showCloseButton={false}
                isConfirming={deleteSession.isPending}
            />
        </ModulePageShell>
    );
}
