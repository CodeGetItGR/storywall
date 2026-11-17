'use client';

import { ChevronRight, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { ProvisionScheduleItemModal } from '@/components/admin/ProvisionScheduleItemModal';
import type { ProvisionScheduleState } from '@/hooks/useProvisionSchedule';
import { formatDate } from '@/lib/datetime';

export function ProvisionEventSchedule({ schedule }: { schedule: ProvisionScheduleState }) {
    const t = useTranslations('AdminPage.accounts.provision');
    const locale = useLocale();

    function handleItemClick(event: MouseEvent<HTMLButtonElement>) {
        schedule.openItem(Number(event.currentTarget.dataset.index));
    }

    return (
        <section aria-labelledby="provision-event-schedule" className="space-y-3 border-t border-border pt-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h3 id="provision-event-schedule" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                    {t('scheduleSection')}
                </h3>
                {schedule.canAdd ? (
                    <button
                        type="button"
                        onClick={schedule.openNew}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-ink-muted hover:bg-canvas hover:text-ink"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t('addSession')}
                    </button>
                ) : null}
            </div>

            {/* Items */}
            {schedule.items.length > 0 ? (
                <ul className="divide-y divide-border rounded-lg bg-canvas">
                    {schedule.items.map((item, index) => {
                        const meta = [
                            item.startAt ? formatDate(locale, item.startAt, { dateStyle: 'medium', timeStyle: 'short' }) : null,
                            item.locationName.trim() || null,
                        ].filter(Boolean);
                        return (
                            <li key={`${index}-${item.title}`}>
                                <button
                                    type="button"
                                    data-index={index}
                                    onClick={handleItemClick}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/60"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-2">
                                            <span className="truncate text-sm font-semibold text-ink">{item.title.trim()}</span>
                                            {schedule.allowsVenue && item.isSecondary ? (
                                                <span className="shrink-0 rounded-full bg-status-neutral-wash px-2 py-0.5 text-[11px] font-bold text-status-neutral">
                                                    {t('receptionVenue')}
                                                </span>
                                            ) : null}
                                        </span>
                                        {meta.length > 0 ? <span className="block truncate text-xs text-ink-faint">{meta.join(' · ')}</span> : null}
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : null}

            {/* Editor */}
            <ProvisionScheduleItemModal schedule={schedule} />
        </section>
    );
}
