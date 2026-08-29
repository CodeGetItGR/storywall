'use client';

import { CheckCircle2, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { cn } from '@/lib/utils';

export type SetupChecklistItem = {
    id: string;
    title: string;
    body: string;
    icon: LucideIcon;
    status: 'complete' | 'missing';
    hint?: string;
    action?: {
        label: string;
        onClick: () => void;
        disabled?: boolean;
        icon?: LucideIcon;
    };
};

export function SetupChecklist({ className, items }: { className?: string; items: SetupChecklistItem[] }) {
    const t = useTranslations('ManagePage.setupChecklist');
    const [expanded, setExpanded] = useState(true);
    const missingCount = items.filter((item) => item.status === 'missing').length;
    const isComplete = missingCount === 0;
    const toggleExpanded = useCallback(() => {
        setExpanded((current) => !current);
    }, []);

    return (
        <section
            className={cn(
                'rounded-lg bg-[linear-gradient(135deg,rgba(255,111,160,0.16),rgba(255,122,89,0.11)_48%,rgba(255,178,89,0.18))] p-4 shadow-[0_14px_32px_rgba(36,31,26,0.07)]',
                className
            )}
        >
            {/* Checklist summary */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{t('title')}</p>
                    <p className="mt-0.5 text-xs leading-5 text-ink-muted">{isComplete ? t('complete') : t('missing', { count: missingCount })}</p>
                </div>
                <button
                    type="button"
                    onClick={toggleExpanded}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/70 text-ink"
                    aria-expanded={expanded}
                    aria-label={expanded ? t('collapse') : t('expand')}
                >
                    {expanded ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
            </div>

            {/* Checklist items */}
            {expanded && (
                <div className="mt-4 space-y-2.5">
                    {items.map((item) => {
                        const Icon = item.icon;
                        const ActionIcon = item.action?.icon;

                        return (
                            <div key={item.id} className="bg-background/68 px-3.5 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 gap-2.5">
                                        <span className={cn('mt-0.5 shrink-0', item.status === 'complete' ? 'text-primary' : 'text-primary-dark')}>
                                            {item.status === 'complete' ? (
                                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                            ) : (
                                                <Icon className="h-4 w-4" aria-hidden="true" />
                                            )}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-ink">{item.title}</p>
                                            <p className="mt-0.5 text-xs leading-5 text-ink-muted">{item.body}</p>
                                        </div>
                                    </div>
                                    {item.action && (
                                        <button
                                            type="button"
                                            onClick={item.action.onClick}
                                            disabled={item.action.disabled}
                                            className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background/85 px-2.5 text-xs font-semibold text-ink disabled:opacity-50"
                                        >
                                            {ActionIcon && <ActionIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                                            {item.action.label}
                                        </button>
                                    )}
                                </div>
                                {item.hint && <p className="mt-2 pl-6 text-xs leading-5 text-ink-muted">{item.hint}</p>}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
