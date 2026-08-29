'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ScheduleEditorSheet } from '@/app/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorSheet';
import { ManagedSessionSection } from '@/components/manage/ManagedSessionSection';
import { useCreateEventSession, useEventSessions, useUpdateEventSession } from '@/hooks/useEventSessions';
import type { EventDetailResponseDto, EventSessionResponseDto } from '@/lib/api/types';
import { toDatetimeLocalValue } from '@/lib/datetime';
import { getManagedSessionDefinitions, type ManagedSessionDefinition } from '@/lib/sessionManagement';

export function EventSessionManagement({ event, canWrite }: { event: EventDetailResponseDto; canWrite: boolean }) {
    const t = useTranslations('ManagePage.sessionManagement');
    const tCreateEvent = useTranslations('CreateEventPage');
    const definitions = getManagedSessionDefinitions(event.eventType);
    const { data: sessions = event.sessions } = useEventSessions(event.id);
    const createSession = useCreateEventSession();
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [creatingDefinition, setCreatingDefinition] = useState<ManagedSessionDefinition | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const updateSession = useUpdateEventSession(editingSessionId ?? '', event.id);
    const editingSession = useMemo(() => sessions.find((session) => session.id === editingSessionId) ?? null, [editingSessionId, sessions]);

    if (definitions.length === 0) return null;

    function openEdit(session: EventSessionResponseDto) {
        setCreatingDefinition(null);
        setEditingSessionId(session.id);
        setEditorOpen(true);
    }

    function openCreate(definition: ManagedSessionDefinition) {
        if (!definition.canCreate) return;
        setEditingSessionId(null);
        setCreatingDefinition(definition);
        setEditorOpen(true);
    }

    function handleOpenChange(open: boolean) {
        setEditorOpen(open);
        if (!open) {
            setEditingSessionId(null);
            setCreatingDefinition(null);
        }
    }

    const prefillTitle = creatingDefinition
        ? tCreateEvent.has(creatingDefinition.defaultTitleKey)
            ? tCreateEvent(creatingDefinition.defaultTitleKey)
            : undefined
        : undefined;

    return (
        <div className="mt-8 border-t border-border pt-6">
            {/* Session management */}
            <div className="mb-4">
                <h2 className="text-base font-bold text-ink">{t('title')}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t('description')}</p>
            </div>
            <div className="grid gap-3">
                {definitions.map((definition) => (
                    <ManagedSessionSection
                        key={definition.role}
                        definition={definition}
                        session={sessions.find(definition.matches) ?? null}
                        canWrite={canWrite}
                        onEdit={openEdit}
                        onCreate={openCreate}
                    />
                ))}
            </div>

            <ScheduleEditorSheet
                open={editorOpen}
                onOpenChange={handleOpenChange}
                eventId={event.id}
                eventStatus={event.status}
                sessions={sessions}
                editingSession={editingSession}
                defaultStartAt={toDatetimeLocalValue(event.schedule.startAt)}
                createSession={createSession}
                updateSession={updateSession}
                secondaryPrefillTitle={creatingDefinition?.role === 'secondary' ? prefillTitle : undefined}
            />
        </div>
    );
}
