'use client';

import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ScheduleEditSessionRow } from '@/components/schedule/ScheduleEditSessionRow';
import type { EventDetailResponseDto, EventSessionResponseDto } from '@/lib/api/types';
import { getManagedSessionDefinitions, type ManagedSessionDefinition } from '@/lib/sessionManagement';

interface ScheduleEditSessionsTableProps {
    event: EventDetailResponseDto;
    sessions: EventSessionResponseDto[];
    canWrite: boolean;
    deleteDisabled: boolean;
    onAddSession: () => void;
    onCreateManagedSession: (definition: ManagedSessionDefinition) => void;
    onEditSession: (session: EventSessionResponseDto) => void;
    onDeleteSession: (session: EventSessionResponseDto) => void;
}

export function ScheduleEditSessionsTable({
    event,
    sessions,
    canWrite,
    deleteDisabled,
    onAddSession,
    onCreateManagedSession,
    onEditSession,
    onDeleteSession,
}: ScheduleEditSessionsTableProps) {
    const t = useTranslations('SchedulePage.host.sessionManagement');
    const locale = useLocale();
    const definitions = getManagedSessionDefinitions(event.eventType);
    const managedRows = definitions.map((definition) => ({
        definition,
        session: sessions.find(definition.matches) ?? null,
    }));
    const managedSessionIds = new Set(managedRows.map((row) => row.session?.id).filter(Boolean));
    const otherSessions = sessions.filter((session) => !managedSessionIds.has(session.id));

    return (
        <section className="grid gap-3">
            {/* Edit session summary */}
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-ink">{t('title')}</h2>
                    <p className="mt-0.5 text-xs leading-5 text-ink-muted">{t('description')}</p>
                </div>
                {canWrite && (
                    <button
                        type="button"
                        onClick={onAddSession}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-gradient-brand px-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">{t('addItem')}</span>
                    </button>
                )}
            </div>

            {/* Managed session rows */}
            <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
                {[...managedRows, ...otherSessions.map((session) => ({ definition: null, session }))].map((row) => (
                    <ScheduleEditSessionRow
                        key={row.definition?.role ?? row.session?.id}
                        definition={row.definition}
                        session={row.session}
                        canWrite={canWrite}
                        deleteDisabled={deleteDisabled}
                        locale={locale}
                        onCreateManagedSession={onCreateManagedSession}
                        onEditSession={onEditSession}
                        onDeleteSession={onDeleteSession}
                    />
                ))}
            </div>
        </section>
    );
}
