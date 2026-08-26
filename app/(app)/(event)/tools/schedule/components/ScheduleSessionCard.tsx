'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { ScheduleMapPreview } from '@/app/(app)/(event)/tools/schedule/components/ScheduleMapPreview';
import { ScheduleSessionActions } from '@/app/(app)/(event)/tools/schedule/components/ScheduleSessionActions';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface ScheduleSessionCardProps {
    session: EventSessionResponseDto;
    isHost: boolean;
    canManage: boolean;
    isEditing: boolean;
    locationContent?: ReactNode;
    timeContent?: ReactNode;
    onEdit: (session: EventSessionResponseDto) => void;
    onDelete: (session: EventSessionResponseDto) => void;
    deleteDisabled: boolean;
    className?: string;
}

export function ScheduleSessionCard({
    session,
    isHost,
    canManage,
    isEditing,
    locationContent,
    timeContent,
    onEdit,
    onDelete,
    deleteDisabled,
    className,
}: ScheduleSessionCardProps) {
    const t = useTranslations('SchedulePage');

    return (
        <article
            className={cn(
                'relative rounded-2xl border bg-card p-4 shadow-sm transition-colors',
                isEditing ? 'border-primary/35 bg-primary-light/20' : 'border-border/60',
                className
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-semibold leading-snug text-ink">{session.title}</h3>
                        {session.isMain && (
                            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-dark">
                                {t('host.mainBadge')}
                            </span>
                        )}
                        {session.isSecondary && (
                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                                {t('host.secondaryBadge')}
                            </span>
                        )}
                    </div>
                    {session.description && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{session.description}</p>}
                </div>

                <div className="flex items-start gap-2">
                    {timeContent}
                    {isHost && canManage && (
                        <ScheduleSessionActions session={session} onEditAction={onEdit} onDeleteAction={onDelete} deleteDisabled={deleteDisabled} />
                    )}
                </div>
            </div>

            {locationContent}

            {session.mapsUrl && (
                <div className={cn('mt-3 grid gap-2', !locationContent && 'mt-4')}>
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="font-medium text-ink-muted">{session.locationName ?? session.mapsUrl}</span>
                    </div>
                    <ScheduleMapPreview
                        mapsUrl={session.mapsUrl}
                        title={t('host.openMap', { title: session.title })}
                        openLabel={t('host.openInGoogleMaps')}
                        previewLabel={t('host.mapPreview')}
                        unavailableLabel={t('host.mapPreviewUnavailable')}
                    />
                </div>
            )}

            {!session.mapsUrl && session.locationName && !locationContent && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-ink-muted">{session.locationName}</span>
                </div>
            )}
        </article>
    );
}
