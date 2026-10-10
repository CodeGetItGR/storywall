'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';

import { LoadingState } from '@/components/ui/LoadingState';
import { cn } from '@/lib/utils';

type ModuleNameRow = {
    moduleKey: string;
    name: string;
    isCustom: boolean;
    Icon: ComponentType<{ className?: string }>;
};

// The event type's modules as read-only rows; a row opens its editor.
export function EventTypeModuleNamesSection({
    rows,
    isLoading,
    onOpenAction,
}: {
    rows: ModuleNameRow[];
    isLoading: boolean;
    onOpenAction: (moduleKey: string) => void;
}) {
    const t = useTranslations('AdminPage.eventTypes.moduleCopy');

    function handleOpen(event: React.MouseEvent<HTMLButtonElement>) {
        const { moduleKey } = event.currentTarget.dataset;
        if (moduleKey) onOpenAction(moduleKey);
    }

    return (
        <section className="mt-5 space-y-2 border-t border-border pt-4">
            {/* Header */}
            <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('title')}</p>

            {/* Rows */}
            {isLoading ? (
                <LoadingState label={t('loading')} className="justify-start py-3" />
            ) : rows.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                    {rows.map(({ moduleKey, name, isCustom, Icon }) => (
                        <li key={moduleKey}>
                            <button
                                type="button"
                                data-module-key={moduleKey}
                                onClick={handleOpen}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-canvas/60"
                            >
                                <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{name}</span>
                                <span
                                    className={cn(
                                        'inline-flex shrink-0 rounded-full px-2 py-1 text-[11px] font-bold',
                                        isCustom ? 'bg-status-good-wash text-status-good' : 'bg-status-neutral-wash text-status-neutral',
                                    )}
                                >
                                    {isCustom ? t('custom') : t('default')}
                                </span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
