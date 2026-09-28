'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';
import type { MouseEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';
import { ERROR_EVENT_SOURCES } from '@/lib/adminBetaFeedback';
import type { ErrorEventSource } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const ALL = 'ALL';

export function ErrorEventFilters({
    source,
    onSourceChangeAction,
    refInput,
    refInvalid,
    onRefChangeAction,
    onClearRefAction,
}: {
    source: ErrorEventSource | null;
    onSourceChangeAction: (source: ErrorEventSource | null) => void;
    refInput: string;
    refInvalid: boolean;
    onRefChangeAction: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClearRefAction: () => void;
}) {
    const t = useTranslations('AdminPage.errorEvents');
    const options = [ALL, ...ERROR_EVENT_SOURCES] as const;

    function handleSourceClick(event: MouseEvent<HTMLButtonElement>) {
        const value = event.currentTarget.dataset.source;
        onSourceChangeAction(!value || value === ALL ? null : (value as ErrorEventSource));
    }

    return (
        <div className="flex flex-wrap items-start gap-4 border-b border-border p-4">
            {/* Source */}
            <div className="flex gap-1 rounded-lg bg-canvas p-1" role="group" aria-label={t('sourceLabel')}>
                {options.map((option) => {
                    const active = option === ALL ? source === null : source === option;
                    return (
                        <button
                            key={option}
                            type="button"
                            data-source={option}
                            onClick={handleSourceClick}
                            aria-pressed={active}
                            className={cn(
                                'rounded-md px-3 py-1.5 text-[12.5px] font-bold transition-colors',
                                active ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                            )}
                        >
                            {t(`sources.${option}`)}
                        </button>
                    );
                })}
            </div>

            {/* Reference */}
            <div className="min-w-56 flex-1 sm:max-w-xs">
                <label className="relative block">
                    <span className="sr-only">{t('refLabel')}</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                    <input
                        type="search"
                        value={refInput}
                        onChange={onRefChangeAction}
                        placeholder={t('refPlaceholder')}
                        aria-invalid={refInvalid}
                        spellCheck={false}
                        className={adminInputClass('pr-9 pl-9 font-mono')}
                    />
                    {refInput ? (
                        <button
                            type="button"
                            onClick={onClearRefAction}
                            aria-label={t('clearRef')}
                            className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-ink-faint hover:text-ink"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    ) : null}
                </label>
                {refInvalid ? <p className="mt-1.5 text-xs text-status-warn">{t('refInvalid')}</p> : null}
            </div>
        </div>
    );
}
