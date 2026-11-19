'use client';

import { CalendarDays, MapPin, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ScheduleEditorSheet } from '@/app/(main)/(app)/(event)/events/[eventId]/tools/schedule/components/ScheduleEditorSheet';
import { SettingsPencilButton } from '@/components/manage/settings/SettingsPencilButton';
import { TargetedSection } from '@/components/manage/TargetedSection';
import { useSettingsVenue } from '@/hooks/useSettingsVenue';
import type { EventDetailResponseDto } from '@/lib/api/types';

// The venue (the secondary session) in the invite preview: "Add venue details" until one exists,
// then its row with a pencil. Both open today's Schedule editor sheet.
export function SettingsVenuePart({ event, canWrite }: { event: EventDetailResponseDto; canWrite: boolean }) {
    const t = useTranslations('HostOnboarding.steps.details');
    const venue = useSettingsVenue(event, canWrite);

    if (!venue.shown || (!venue.venue && !venue.canEdit)) return null;

    return (
        <TargetedSection id="venue-session" className="rounded-[1rem]">
            {venue.venue ? (
                // Venue row
                <div className="flex items-start gap-2.5 px-3 py-2.5">
                    <div className="min-w-0 flex-1 space-y-1.5 text-sm leading-snug">
                        <p className="font-semibold text-ink">{venue.venue.title}</p>
                        {venue.venueDate && (
                            <p className="flex gap-2 text-ink">
                                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                {venue.venueDate}
                            </p>
                        )}
                        {venue.venue.locationName && (
                            <p className="flex gap-2 text-ink">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                <span className="min-w-0">
                                    {venue.venue.locationName}
                                    {venue.venue.locationAddress && <span className="block text-ink-muted">{venue.venue.locationAddress}</span>}
                                </span>
                            </p>
                        )}
                    </div>
                    {venue.canEdit && <SettingsPencilButton label={t('venueEdit')} onClick={venue.openSheet} />}
                </div>
            ) : (
                // Add venue prompt
                <div className="mx-3 my-1">
                    <button
                        type="button"
                        onClick={venue.openSheet}
                        disabled={!venue.canAdd}
                        className="flex min-h-12 w-full items-center gap-2.5 rounded-[1rem] border-[1.5px] border-dashed border-primary/40 px-3.5 text-sm font-bold text-primary transition-colors hover:bg-primary-light/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus className="h-4.5 w-4.5" strokeWidth={2.4} aria-hidden="true" />
                        {t('venueAdd')}
                    </button>
                    {!venue.canAdd && venue.sessionLimitMessage && <p className="mt-1.5 text-xs text-ink-muted">{venue.sessionLimitMessage}</p>}
                </div>
            )}

            {/* Venue editor */}
            {venue.canEdit && (
                <ScheduleEditorSheet
                    open={venue.sheetOpen}
                    onOpenChange={venue.handleSheetOpenChange}
                    eventId={event.id}
                    eventStatus={event.status}
                    sessions={venue.sessions}
                    editingSession={venue.venue}
                    defaultStartAt={venue.defaultStartAt}
                    createSession={venue.createSession}
                    updateSession={venue.updateSession}
                    secondaryPrefillTitle={venue.prefillTitle}
                />
            )}
        </TargetedSection>
    );
}
