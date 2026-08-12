'use client';

import { MapPin, PencilLine, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { ScheduleMapPreview } from '@/app/(app)/(event)/tools/schedule/components/ScheduleMapPreview';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

function SessionActions({
    session,
    onEdit,
    onDelete,
    deleteDisabled,
}: {
    session: EventSessionResponseDto;
    onEdit: (session: EventSessionResponseDto) => void;
    onDelete: (session: EventSessionResponseDto) => void;
    deleteDisabled: boolean;
}) {
    const t = useTranslations('SchedulePage');

    function handleEditClick() {
        onEdit(session);
    }

    function handleDeleteClick() {
        onDelete(session);
    }

    return (
        <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={handleEditClick} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-ink-muted transition-colors hover:border-primary/20 hover:bg-primary-light hover:text-primary-dark" aria-label={t('host.editSession', { title: session.title })}>
                <PencilLine className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={handleDeleteClick} disabled={deleteDisabled} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-ink-muted transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50" aria-label={t('host.deleteSession', { title: session.title })}>
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

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
                    <h3 className="text-sm font-semibold leading-snug text-ink">{session.title}</h3>
                    {session.description && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{session.description}</p>}
                </div>

                <div className="flex items-start gap-2">
                    {timeContent}
                    {isHost && canManage && <SessionActions session={session} onEdit={onEdit} onDelete={onDelete} deleteDisabled={deleteDisabled} />}
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
