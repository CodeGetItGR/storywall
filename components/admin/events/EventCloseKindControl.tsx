'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import type { CloseKind } from '@/lib/adminEvents';
import { cn } from '@/lib/utils';

const OPTIONS: CloseKind[] = ['POLICY', 'OPERATIONAL'];

// A close for a broken rule, or for a reason that isn't one (the host asked, a duplicate, payment).
export function EventCloseKindControl({ value, onChangeAction }: { value: CloseKind; onChangeAction: (kind: CloseKind) => void }) {
    const t = useTranslations('AdminPage.events.close');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChangeAction(event.currentTarget.dataset.kind as CloseKind);
    }

    return (
        <div>
            <p className="mb-2 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('kind')}</p>
            <div className="flex gap-1 rounded-lg bg-canvas p-1">
                {OPTIONS.map((option) => (
                    <button
                        key={option}
                        type="button"
                        data-kind={option}
                        onClick={handleClick}
                        aria-pressed={value === option}
                        className={cn(
                            'flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors',
                            value === option ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                        )}
                    >
                        {t(`kinds.${option}`)}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-faint">{t(`kindHints.${value}`)}</p>
        </div>
    );
}
