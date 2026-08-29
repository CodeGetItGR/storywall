'use client';

import { CalendarClock, Church, MapPin, Martini, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { TargetedSection } from '@/components/manage/TargetedSection';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { formatTimeRange } from '@/lib/datetime';
import type { ManagedSessionDefinition } from '@/lib/sessionManagement';
import { cn } from '@/lib/utils';

interface ScheduleEditSessionRowProps {
    definition: ManagedSessionDefinition | null;
    session: EventSessionResponseDto | null;
    canWrite: boolean;
    deleteDisabled: boolean;
    locale: string;
    onCreateManagedSession: (definition: ManagedSessionDefinition) => void;
    onEditSession: (session: EventSessionResponseDto) => void;
    onDeleteSession: (session: EventSessionResponseDto) => void;
}

export function ScheduleEditSessionRow({
    definition,
    session,
    canWrite,
    deleteDisabled,
    locale,
    onCreateManagedSession,
    onEditSession,
    onDeleteSession,
}: ScheduleEditSessionRowProps) {
    const t = useTranslations('SchedulePage.host.sessionManagement');
    const isManaged = Boolean(definition || session?.isMain || session?.isSecondary);
    const Icon = definition?.role === 'main' || session?.isMain ? Church : definition?.role === 'secondary' || session?.isSecondary ? Martini : CalendarClock;
    const title = session?.title ?? (definition ? t(`${definition.titleKey}.title`) : t('untitled'));
    const time = session?.startAt ? formatTimeRange(locale, session.startAt, session.endAt, t('notSet')) : t('notSet');
    const location = session?.locationName || t('notSet');
    const canCreate = canWrite && Boolean(definition?.canCreate && !session);
    const canEdit = canWrite && Boolean(session);

    function handleCreate() {
        if (definition) onCreateManagedSession(definition);
    }

    function handleEdit() {
        if (session) onEditSession(session);
    }

    function handleDelete() {
        if (session) onDeleteSession(session);
    }

    return (
        <TargetedSection
            id={definition?.sectionId ?? session?.id ?? 'schedule-session-row'}
            className={cn('rounded-none border-b border-border/60 last:border-b-0', isManaged && 'bg-primary-light/25')}
        >
            {/* Session row */}
            <div className="grid grid-cols-[1fr_auto] gap-3 px-3.5 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(7rem,0.75fr)_minmax(0,0.9fr)_auto] sm:items-center">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{title}</p>
                        {!session && <p className="mt-0.5 text-xs text-ink-muted">{definition?.canCreate ? t('missing') : t('mainMissing')}</p>}
                    </div>
                </div>
                <div className="hidden min-w-0 items-center gap-1.5 text-xs text-ink-muted sm:flex">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate tabular-nums">{time}</span>
                </div>
                <div className="hidden min-w-0 items-center gap-1.5 text-xs text-ink-muted sm:flex">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{location}</span>
                </div>
                <div className="flex items-center justify-end gap-1">
                    {canCreate && (
                        <button
                            type="button"
                            onClick={handleCreate}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-ink-muted transition-colors hover:border-primary/20 hover:bg-primary-light hover:text-primary-dark"
                            aria-label={definition ? t('addNamed', { title: t(`${definition.titleKey}.title`) }) : t('addItem')}
                        >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    )}
                    {canEdit && (
                        <>
                            <button
                                type="button"
                                onClick={handleEdit}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-ink-muted transition-colors hover:border-primary/20 hover:bg-primary-light hover:text-primary-dark"
                                aria-label={t('editNamed', { title })}
                            >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleteDisabled}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-ink-muted transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={t('deleteNamed', { title })}
                            >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        </>
                    )}
                </div>
                {session && (
                    <div className="col-span-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted sm:hidden">
                        <span className="tabular-nums">{time}</span>
                        <span className="truncate">{location}</span>
                    </div>
                )}
            </div>
        </TargetedSection>
    );
}
