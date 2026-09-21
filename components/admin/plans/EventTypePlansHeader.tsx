'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function EventTypePlansHeader({ eventType, onCreateAction }: { eventType: PlatformEventTypeResponseDto; onCreateAction: () => void }) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();

    return (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex min-w-0 items-center gap-2.5">
                <h2 className="truncate text-xl font-semibold tracking-tight text-ink">{localizedText(eventType.name, eventType.eventTypeKey)}</h2>
                <span className="font-mono text-[11px] text-ink-faint">{eventType.eventTypeKey}</span>
                <span
                    className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        eventType.isEnabled ? 'bg-status-good-wash text-status-good' : 'bg-status-neutral-wash text-status-neutral'
                    )}
                >
                    {eventType.isEnabled ? t('eventTypes.enabled') : t('eventTypes.disabled')}
                </span>
            </div>
            <button
                type="button"
                onClick={onCreateAction}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary/30"
            >
                <Plus className="h-4 w-4" />
                {t('plans.create.open')}
            </button>
        </header>
    );
}
