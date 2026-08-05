'use client';

import { ArrowLeft, Calendar, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SchedulePageHeaderProps {
    t: ReturnType<typeof useTranslations>;
    onBack: () => void;
    onAddSession: () => void;
    canAddSession: boolean;
}

export function SchedulePageHeader({ t, onBack, onAddSession, canAddSession }: SchedulePageHeaderProps) {
    return (
        <>
            <div className="flex items-center justify-between gap-3 py-4">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label={t('back')}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-amber-500" />
                    <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                </div>
                {canAddSession ? (
                    <button
                        type="button"
                        onClick={onAddSession}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-brand px-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('host.submit')}</span>
                    </button>
                ) : (
                    <span className="h-9 w-9" aria-hidden="true" />
                )}
            </div>
            <p className="mb-6 text-sm leading-relaxed text-ink-muted">{t('subtitle')}</p>
        </>
    );
}
