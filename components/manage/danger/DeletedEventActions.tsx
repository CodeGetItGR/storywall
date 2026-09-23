'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { useToolsMenuItems } from '@/hooks/useToolsMenuItems';

/** What a host can still open on a deleted event: the same gallery/wishbook
 * entries the tools menu keeps, shown as full rows with a read-only description. */
export function DeletedEventActions() {
    const t = useTranslations('ManagePage');
    const items = useToolsMenuItems();

    if (items.length === 0) return null;

    return (
        <section>
            <h2 className="mb-3 text-sm font-bold tracking-wide text-ink-muted uppercase">{t('settings.deleted.actionsTitle')}</h2>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
                {items.map(({ key, href, icon: Icon, label }) => (
                    <Link key={key} href={href} className="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
                            <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-ink">{label}</span>
                            {t.has(`settings.deleted.actions.${key}`) && (
                                <span className="block text-xs leading-relaxed text-ink-muted">{t(`settings.deleted.actions.${key}`)}</span>
                            )}
                        </span>
                        <ChevronRight
                            className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                        />
                    </Link>
                ))}
            </div>
        </section>
    );
}
