'use client';

import { Calendar, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ScheduleEditorSheet } from '@/app/(app)/(event)/tools/schedule/components/ScheduleEditorSheet';
import { ScheduleEmptyState } from '@/app/(app)/(event)/tools/schedule/components/ScheduleEmptyState';
import { ScheduleSessionsList } from '@/app/(app)/(event)/tools/schedule/components/ScheduleSessionsList';
import { EventRouteGate, EventRouteSpinner } from '@/components/routing/EventRouteGate';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateEventSession, useDeleteEventSession, useEventSessions, useUpdateEventSession } from '@/hooks/useEventSessions';
import type { EventDetailResponseDto, EventSessionResponseDto } from '@/lib/api/types';
import { toDatetimeLocalValue } from '@/lib/datetime';
import { isEventWritable } from '@/lib/eventLifecycle';

export default function SchedulePage() {
    return <EventRouteGate>{(context) => <ScheduleScreen {...context} />}</EventRouteGate>;
}

function ScheduleScreen({ activeEvent, eventId, isHost }: { activeEvent: EventDetailResponseDto; eventId: string; isHost: boolean }) {
    const t = useTranslations('SchedulePage');
    const toErrorMessage = useApiErrorMessage();
    const locale = useLocale();
    const router = useRouter();
    const canWrite = isEventWritable(activeEvent?.status);
    const canManageSchedule = isHost && canWrite;

    const { data: sessions = [], isLoading: isLoadingSessions } = useEventSessions(eventId);
    const createSession = useCreateEventSession();
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<EventSessionResponseDto | null>(null);
    const updateSession = useUpdateEventSession(editingSessionId ?? '', eventId ?? '');
    const deleteSession = useDeleteEventSession(eventId ?? '');

    const defaultStartAt = activeEvent ? toDatetimeLocalValue(activeEvent.schedule.startAt) : '';
    const editingSession = useMemo(
        () => (editingSessionId ? (sessions.find((session) => session.id === editingSessionId) ?? null) : null),
        [editingSessionId, sessions]
    );

    function handleBack() {
        router.back();
    }

    function openCreateEditor() {
        if (!canManageSchedule) return;
        setDeleteError(null);
        setEditingSessionId(null);
        setEditorOpen(true);
    }

    function beginEditSession(session: EventSessionResponseDto) {
        if (!canManageSchedule) return;
        setDeleteError(null);
        setEditingSessionId(session.id);
        setEditorOpen(true);
    }

    function closeEditor() {
        setEditorOpen(false);
        setEditingSessionId(null);
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
                    <button
                        type="button"
                        onClick={openCreateEditor}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-brand px-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('host.submit')}</span>
                    </button>
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
                    sessions={sessions}
                    editingSession={editingSession}
                    defaultStartAt={defaultStartAt ?? ''}
                    createSession={createSession}
                    updateSession={updateSession}
                />
            )}

            <ConfirmActionModal
                open={Boolean(deleteTarget)}
                onClose={handleCloseDeleteSessionConfirm}
                onConfirm={confirmDeleteSession}
                title={deleteTarget ? t('host.deleteSession', { title: deleteTarget.title }) : ''}
                body={deleteTarget ? t('host.deleteConfirm', { title: deleteTarget.title }) : ''}
                confirmLabel={t('host.deleteSession', { title: '' }).trim()}
                cancelLabel={t('host.cancelEdit')}
                isConfirming={deleteSession.isPending}
            />
        </ModulePageShell>
    );
}
