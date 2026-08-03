'use client';

import type { LucideIcon } from 'lucide-react';
import { Image, MessageSquareText, Music4, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { ModuleKeyConvention } from '@/lib/api/types';
import { useActiveEvent } from '@/providers/EventProvider';

type QuickAccessItem = {
    moduleKey: ModuleKeyConvention;
    href: string;
    icon: LucideIcon;
    visible: boolean;
    key: 'posts' | 'stories' | 'rsvp' | 'playlist';
};

const quickAccessItems: QuickAccessItem[] = [
    {
        moduleKey: 'posts',
        href: '#posts',
        icon: MessageSquareText,
        visible: false,
        key: 'posts',
    },
    {
        moduleKey: 'stories',
        href: '#stories',
        icon: Image,
        visible: false,
        key: 'stories',
    },
    {
        moduleKey: 'rsvp',
        href: '/tools/rsvp',
        icon: Ticket,
        visible: false,
        key: 'rsvp',
    },
    {
        moduleKey: 'playlist',
        href: '/tools/playlist',
        icon: Music4,
        visible: true,
        key: 'playlist',
    },
];

export function QuickAccessBar() {
    const t = useTranslations('FeedQuickAccessBar');
    const activeEvent = useActiveEvent();

    const enabledItems = useMemo(() => {
        if (!activeEvent) return [];

        const enabledModules = new Set(activeEvent.modules.filter((module) => module.isEnabled).map((module) => module.moduleKey));

        return activeEvent.modules
            .filter((module) => module.isEnabled)
            .map((module) => quickAccessItems.find((item) => item.moduleKey === module.moduleKey && item.visible))
            .filter((item): item is QuickAccessItem => !!item && enabledModules.has(item.moduleKey));
    }, [activeEvent]);

    if (enabledItems.length === 0) {
        return null;
    }

    return (
        <section aria-label={t('ariaLabel')} className="px-4 pb-2 mt-4">
            <div className="rounded-[1.5rem] border border-border bg-linear-to-r from-card via-surface-muted to-card p-3 shadow-[0_12px_28px_rgba(36,31,26,0.05)] sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">{t('eyebrow')}</p>
                        <h3 className="mt-1 text-base font-semibold text-ink">{t('title')}</h3>
                    </div>
                    <p className="hidden max-w-52 text-right text-sm text-ink-muted sm:block">{t('subtitle')}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                    {enabledItems.map(({ key, href, icon: Icon }) => (
                        <Link
                            key={key}
                            href={href}
                            className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_10px_24px_rgba(36,31,26,0.06)]"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-muted transition-colors group-hover:bg-primary-light group-hover:text-primary-dark">
                                <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-medium text-ink">{t(`items.${key}.label`)}</span>
                                <span className="block text-xs text-ink-muted">{t(`items.${key}.subtitle`)}</span>
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
