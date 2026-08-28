'use client';

import { Calendar, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ScheduleEmptyStateProps {
    isHost: boolean;
    canWrite: boolean;
    canAddSession: boolean;
    onAddSession: () => void;
}

export function ScheduleEmptyState({ isHost, canWrite, canAddSession, onAddSession }: ScheduleEmptyStateProps) {
    const t = useTranslations('SchedulePage');
    const hostReadOnly = isHost && !canWrite;

    return (
        <div className="flex flex-col items-center gap-5 py-8 text-center text-sm text-ink-muted">
            <Calendar className="h-10 w-auto" aria-hidden="true" />
            <p>{hostReadOnly ? t('host.emptyReadOnlyBody') : isHost ? t('host.emptyTitle') : t('guest.emptyTitle')}</p>
            {canAddSession && (
                <button
                    type="button"
                    onClick={onAddSession}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
                >
                    <Plus className="h-4 w-4" />
                    {t('host.submit')}
                </button>
            )}
        </div>
    );
}
