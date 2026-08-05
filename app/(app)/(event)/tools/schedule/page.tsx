'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { ScheduleEditorSheet } from '@/app/(app)/(event)/tools/schedule/components/ScheduleEditorSheet';
import { ScheduleEmptyState } from '@/app/(app)/(event)/tools/schedule/components/ScheduleEmptyState';
import { SchedulePageHeader } from '@/app/(app)/(event)/tools/schedule/components/SchedulePageHeader';
import { ScheduleSessionsList } from '@/app/(app)/(event)/tools/schedule/components/ScheduleSessionsList';
import { useCreateEventSession, useDeleteEventSession, useEventSessions, useUpdateEventSession } from '@/hooks/useEventSessions';
import { getErrorMessage } from '@/lib/api/errors';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { toDatetimeLocalValue } from '@/lib/datetime';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

export default function SchedulePage() {
    const t = useTranslations('SchedulePage');
    const locale = useLocale();
    const router = useRouter();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();
    const eventId = activeEvent?.id ?? null;

    const { data: sessions = [], isLoading: isLoadingSessions } = useEventSessions(eventId);
    const createSession = useCreateEventSession();
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const updateSession = useUpdateEventSession(editingSessionId ?? '', eventId ?? '');
    const deleteSession = useDeleteEventSession(eventId ?? '');

    useEffect(() => {
        if (isContextLoading) return;
        if (!eventId) {
            router.replace(routes.welcome);
        }
    }, [eventId, isContextLoading, router]);

    const defaultStartAt = activeEvent ? toDatetimeLocalValue(activeEvent.schedule.startAt) : '';
    const editingSession = useMemo(
        () => (editingSessionId ? sessions.find((session) => session.id === editingSessionId) ?? null : null),
        [editingSessionId, sessions]
    );

    function handleBack() {
        if (window.history.length > 1) {
            router.back();
            return;
        }

        router.push(routes.tools.root);
    }

    function openCreateEditor() {
        setDeleteError(null);
        setEditingSessionId(null);
        setEditorOpen(true);
    }

    function beginEditSession(session: EventSessionResponseDto) {
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

        setEditorOpen(true);
    }

    async function handleDeleteSession(session: EventSessionResponseDto) {
        const confirmed = window.confirm(t('host.deleteConfirm', { title: session.title }));
        if (!confirmed) return;

        setDeleteError(null);

        try {
            await deleteSession.mutateAsync(session.id);
            if (editingSessionId === session.id) {
                closeEditor();
            }
        } catch (error) {
            setDeleteError(getErrorMessage(error));
        }
    }

    if (isContextLoading || !activeEvent || isLoadingSessions) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <SchedulePageHeader t={t} onBack={handleBack} onAddSession={openCreateEditor} canAddSession={isHost} />

            {deleteError && <p className="mb-4 text-xs font-medium text-rose-500">{deleteError}</p>}

            {sessions.length === 0 ? (
                <ScheduleEmptyState isHost={isHost} t={t} />
            ) : (
                <ScheduleSessionsList
                    sessions={sessions}
                    editingSessionId={editingSessionId}
                    isHost={isHost}
                    locale={locale}
                    t={t}
                    onEdit={beginEditSession}
                    onDelete={handleDeleteSession}
                    deleteDisabled={deleteSession.isPending}
                />
            )}

            {isHost && (
                <ScheduleEditorSheet
                    open={editorOpen}
                    onOpenChange={handleEditorOpenChange}
                    eventId={eventId}
                    sessions={sessions}
                    editingSession={editingSession}
                    defaultStartAt={defaultStartAt}
                    createSession={createSession}
                    updateSession={updateSession}
                    t={t}
                />
            )}
        </div>
    );
}
