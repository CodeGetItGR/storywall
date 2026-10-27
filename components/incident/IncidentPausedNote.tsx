'use client';

import { useTranslations } from 'next-intl';

import { INCIDENT_MODE } from '@/lib/incident';
import { cn } from '@/lib/utils';

// Says why a purchase or upload control is disabled while the incident switch is on.
export function IncidentPausedNote({ className }: { className?: string }) {
    const t = useTranslations('Incident');
    if (!INCIDENT_MODE) return null;
    return <p className={cn('text-xs font-medium text-amber-800', className)}>{t('paused')}</p>;
}
