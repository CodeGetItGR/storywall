'use client';

import { CalendarDays, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SettingsCoverHero } from '@/components/manage/settings/SettingsCoverHero';
import { SettingsPreviewRow } from '@/components/manage/settings/SettingsPreviewRow';
import { SettingsVenuePart } from '@/components/manage/settings/SettingsVenuePart';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { SettingsPart } from '@/lib/settingsPreview';

type SettingsPreviewProps = {
    event: EventDetailResponseDto;
    parts: SettingsPart[];
    labels: Record<SettingsPart, string>;
    openPart: SettingsPart | null;
    canEdit: (part: SettingsPart) => boolean;
    canWrite: boolean;
    startText: string | null;
    endText: string | null;
    onEditAction: (part: SettingsPart) => void;
};

// The event details as guests see them on the invite, each part with its own pencil (S2).
export function SettingsPreview({ event, parts, labels, openPart, canEdit, canWrite, startText, endText, onEditAction }: SettingsPreviewProps) {
    const t = useTranslations('ManagePage.settings');
    const has = (part: SettingsPart) => parts.includes(part);

    function rowProps(part: SettingsPart) {
        return { part, label: labels[part], canEdit: canEdit(part), selected: openPart === part, onEditAction };
    }

    return (
        <div className="flex flex-col overflow-hidden rounded-[1.625rem] bg-background shadow-[0_2px_14px_rgba(36,31,26,0.1)]">
            {/* Cover */}
            <SettingsCoverHero
                coverUrl={event.coverMedia?.mediaUrl ?? null}
                label={labels.cover}
                canEdit={canEdit('cover')}
                selected={openPart === 'cover'}
                onEditAction={onEditAction}
            />

            <div className="flex flex-col gap-0.5 px-2 pt-2.5 pb-3.5">
                {/* Title */}
                <SettingsPreviewRow {...rowProps('title')}>
                    <p className="text-2xl font-bold text-balance break-words text-ink">{event.title}</p>
                </SettingsPreviewRow>

                {/* Date */}
                {has('date') && (
                    <SettingsPreviewRow {...rowProps('date')}>
                        <p className="flex gap-2 text-sm leading-snug text-ink">
                            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                            <span className="min-w-0">
                                {startText}
                                {endText && (
                                    <span className="block text-ink-muted">
                                        {t('fields.endAt')} {endText}
                                    </span>
                                )}
                            </span>
                        </p>
                    </SettingsPreviewRow>
                )}

                {/* Location */}
                {has('location') && (
                    <SettingsPreviewRow {...rowProps('location')}>
                        <p className="flex gap-2 text-sm leading-snug text-ink">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                            <span className="min-w-0 break-words">
                                {event.location.name}
                                {event.location.address && <span className="block text-ink-muted">{event.location.address}</span>}
                            </span>
                        </p>
                    </SettingsPreviewRow>
                )}

                {/* Venue */}
                <SettingsVenuePart event={event} canWrite={canWrite} />

                {/* Description */}
                <SettingsPreviewRow {...rowProps('description')}>
                    {event.description ? (
                        <p className="text-sm leading-relaxed break-words whitespace-pre-line text-ink-muted">{event.description}</p>
                    ) : (
                        <p className="text-sm text-ink-faint">{labels.description}</p>
                    )}
                </SettingsPreviewRow>
            </div>
        </div>
    );
}
