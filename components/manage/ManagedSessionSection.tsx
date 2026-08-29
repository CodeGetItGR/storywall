'use client';

import { CalendarClock, Church, MapPin, Martini, Pencil, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { TargetedSection } from '@/components/manage/TargetedSection';
import type { EventSessionResponseDto } from '@/lib/api/types';
import type { ManagedSessionDefinition } from '@/lib/sessionManagement';

interface ManagedSessionSectionProps {
    definition: ManagedSessionDefinition;
    session: EventSessionResponseDto | null;
    canWrite: boolean;
    onEdit: (session: EventSessionResponseDto) => void;
    onCreate: (definition: ManagedSessionDefinition) => void;
}

export function ManagedSessionSection({ definition, session, canWrite, onEdit, onCreate }: ManagedSessionSectionProps) {
    const t = useTranslations('ManagePage.sessionManagement');
    const locale = useLocale();
    const Icon = definition.role === 'main' ? Church : Martini;
    const date = session?.startAt
        ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.startAt))
        : t('notSet');

    function handleAction() {
        if (session) onEdit(session);
        else onCreate(definition);
    }

    const canAct = canWrite && Boolean(session || definition.canCreate);

    return (
        <TargetedSection id={definition.sectionId} className="border border-border/70 bg-background p-4 sm:p-5">
            {/* Session heading */}
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">{t(`${definition.titleKey}.title`)}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{t(`${definition.titleKey}.description`)}</p>
                </div>
                {canAct && (
                    <button
                        type="button"
                        onClick={handleAction}
                        aria-label={
                            session
                                ? t('editNamed', { title: t(`${definition.titleKey}.title`) })
                                : t('addNamed', { title: t(`${definition.titleKey}.title`) })
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-primary-light hover:text-primary"
                    >
                        {session ? <Pencil className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                    </button>
                )}
            </div>

            {/* Session summary */}
            {session ? (
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="flex min-w-0 items-start gap-2">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                        <div className="min-w-0">
                            <dt className="text-xs text-ink-faint">{t('date')}</dt>
                            <dd className="truncate font-medium text-ink">{date}</dd>
                        </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                        <div className="min-w-0">
                            <dt className="text-xs text-ink-faint">{t('location')}</dt>
                            <dd className="truncate font-medium text-ink">{session.locationName || t('notSet')}</dd>
                        </div>
                    </div>
                </dl>
            ) : (
                <p className="mt-4 text-sm text-ink-muted">{definition.canCreate ? t('missing') : t('mainMissing')}</p>
            )}
        </TargetedSection>
    );
}
