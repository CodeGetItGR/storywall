'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import type { SiteNoticeTone } from '@/lib/api/types';
import { SITE_NOTICE_TONES } from '@/lib/siteNoticeForm';
import { cn } from '@/lib/utils';

const LABEL_ID = 'site-notice-tone-label';

// One choice of four, in the same look as VisibilitySegmentedControl.
export function SiteNoticeToneControl({ value, onChangeAction }: { value: SiteNoticeTone; onChangeAction: (tone: SiteNoticeTone) => void }) {
    const t = useTranslations('AdminPage.siteNotices');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChangeAction(event.currentTarget.dataset.tone as SiteNoticeTone);
    }

    return (
        <div role="group" aria-labelledby={LABEL_ID} className="flex flex-col gap-1.5">
            <p id={LABEL_ID} className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                {t('fields.tone')}
            </p>
            <div className="flex gap-1 rounded-lg bg-canvas p-1">
                {SITE_NOTICE_TONES.map((tone) => (
                    <button
                        key={tone}
                        type="button"
                        data-tone={tone}
                        onClick={handleClick}
                        aria-pressed={value === tone}
                        className={cn(
                            'min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors',
                            value === tone ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                        )}
                    >
                        {t(`tone.${tone}`)}
                    </button>
                ))}
            </div>
        </div>
    );
}
