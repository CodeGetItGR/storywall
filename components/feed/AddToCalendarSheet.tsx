'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AppleMark, GoogleCalendarMark, Microsoft365Mark, OutlookMark } from '@/components/feed/CalendarServiceMarks';
import { Modal } from '@/components/ui/modal';
import type { CalendarLinks } from '@/hooks/useAddToCalendar';
import { formatDate } from '@/lib/datetime';
import type { CalendarEntry } from '@/lib/eventCalendar';
import { cn } from '@/lib/utils';

const entryDateFormat: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

const calendarMarkClassName = 'h-6 w-6 shrink-0';

const calendarOptionClassName =
    'flex min-h-12 w-full items-center gap-3 rounded-2xl bg-surface-muted px-4 text-sm font-semibold text-ink focus-ring transition-colors hover:bg-surface-muted/70';

export function AddToCalendarSheet({
    open,
    onClose,
    entries,
    selectedIndex,
    onSelectEntry,
    links,
}: {
    open: boolean;
    onClose: () => void;
    entries: CalendarEntry[];
    selectedIndex: number;
    onSelectEntry: (index: number) => void;
    links: CalendarLinks | null;
}) {
    const t = useTranslations('FeedPage');
    const locale = useLocale();

    function handleEntryChange(changeEvent: React.ChangeEvent<HTMLInputElement>) {
        onSelectEntry(Number(changeEvent.currentTarget.value));
    }

    return (
        <Modal ariaLabel={t('addToCalendar')} closeLabel={t('close')} onClose={onClose} open={open} size="sm" variant="sheet">
            <Modal.Body className="p-5 sm:p-6">
                {/* Header */}
                <h2 className="pr-10 text-lg font-bold text-ink">{t('addToCalendar')}</h2>

                {/* Entries */}
                {entries.length > 1 && (
                    <fieldset className="mt-4 flex flex-col gap-1">
                        <legend className="sr-only">{t('calendarEntry')}</legend>
                        {entries.map((entry, index) => (
                            <label
                                key={entry.sessionId ?? 'event'}
                                className={cn(
                                    'flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors',
                                    index === selectedIndex ? 'bg-surface-muted' : 'hover:bg-surface-muted/60',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="calendar-entry"
                                    value={index}
                                    checked={index === selectedIndex}
                                    onChange={handleEntryChange}
                                    className="h-4 w-4 shrink-0 accent-primary"
                                />
                                <span className="flex min-w-0 flex-col">
                                    <span className="truncate text-sm font-semibold text-ink">{entry.label}</span>
                                    <span className="text-xs text-ink-muted">{formatDate(locale, entry.startAt, entryDateFormat)}</span>
                                </span>
                            </label>
                        ))}
                    </fieldset>
                )}

                {/* Calendars */}
                {links && (
                    <div className="mt-5 flex flex-col gap-2">
                        <a href={links.google} target="_blank" rel="noopener noreferrer" className={calendarOptionClassName}>
                            <GoogleCalendarMark className={calendarMarkClassName} />
                            {t('calendarGoogle')}
                        </a>
                        <a href={links.apple} className={calendarOptionClassName}>
                            <AppleMark className={calendarMarkClassName} />
                            {t('calendarApple')}
                        </a>
                        <a href={links.outlook} target="_blank" rel="noopener noreferrer" className={calendarOptionClassName}>
                            <OutlookMark className={calendarMarkClassName} />
                            {t('calendarOutlook')}
                        </a>
                        <a href={links.microsoft365} target="_blank" rel="noopener noreferrer" className={calendarOptionClassName}>
                            <Microsoft365Mark className={calendarMarkClassName} />
                            {t('calendarMicrosoft365')}
                        </a>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
}
