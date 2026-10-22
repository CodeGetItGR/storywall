'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, type MouseEvent } from 'react';

import { CHOOSABLE_AREAS, type ChoosableArea, type SiteNoticeForm } from '@/lib/siteNoticeForm';
import { cn } from '@/lib/utils';

const WHERE_OPTIONS: SiteNoticeForm['where'][] = ['everywhere', 'choose'];
const LABEL_ID = 'site-notice-where-label';

// "Everywhere / Choose areas" plus the area checkboxes: one control for one decision.
export function SiteNoticeAreasControl({
    where,
    areas,
    onWhereChangeAction,
    onToggleAreaAction,
}: {
    where: SiteNoticeForm['where'];
    areas: ChoosableArea[];
    onWhereChangeAction: (where: SiteNoticeForm['where']) => void;
    onToggleAreaAction: (area: ChoosableArea) => void;
}) {
    const t = useTranslations('AdminPage.siteNotices');

    function handleWhereClick(event: MouseEvent<HTMLButtonElement>) {
        onWhereChangeAction(event.currentTarget.dataset.where as SiteNoticeForm['where']);
    }

    function handleAreaChange(event: ChangeEvent<HTMLInputElement>) {
        onToggleAreaAction(event.currentTarget.value as ChoosableArea);
    }

    return (
        <div role="group" aria-labelledby={LABEL_ID} className="flex flex-col gap-1.5">
            {/* Label */}
            <p id={LABEL_ID} className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                {t('fields.where')}
            </p>

            {/* Choice */}
            <div className="flex gap-1 rounded-lg bg-canvas p-1">
                {WHERE_OPTIONS.map((option) => (
                    <button
                        key={option}
                        type="button"
                        data-where={option}
                        onClick={handleWhereClick}
                        aria-pressed={where === option}
                        className={cn(
                            'flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors',
                            where === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                        )}
                    >
                        {t(`where.${option}`)}
                    </button>
                ))}
            </div>
            <p className="text-xs leading-5 text-ink-faint">{t(`whereHint.${where}`)}</p>

            {/* Areas */}
            {where === 'choose' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                    {CHOOSABLE_AREAS.map((area) => (
                        <label key={area} className="flex min-h-9 items-center gap-2 text-sm text-ink">
                            <input
                                type="checkbox"
                                value={area}
                                checked={areas.includes(area)}
                                onChange={handleAreaChange}
                                className="h-4 w-4 accent-ink"
                            />
                            {t(`area.${area}`)}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
