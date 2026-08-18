'use client';

import type { LucideIcon } from 'lucide-react';
import { BookHeart, Gift, Image, Images, MessageSquareText, Music4, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { ModuleKeyConvention } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

type QuickAccessItem = {
    moduleKey: ModuleKeyConvention;
    href: string;
    icon: LucideIcon;
    visible: boolean;
    key: 'posts' | 'stories' | 'rsvp' | 'playlist' | 'gallery' | 'gifts' | 'wishbook';
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
        href: routes.tools.rsvpSubmit,
        icon: Ticket,
        visible: false,
        key: 'rsvp',
    },
    {
        moduleKey: 'playlist',
        href: routes.tools.playlist,
        icon: Music4,
        visible: true,
        key: 'playlist',
    },
    {
        moduleKey: 'gallery',
        href: routes.tools.gallery,
        icon: Images,
        visible: true,
        key: 'gallery',
    },
    {
        moduleKey: 'wishlist',
        href: routes.tools.gifts,
        icon: Gift,
        visible: true,
        key: 'gifts',
    },
    {
        moduleKey: 'wishbook',
        href: routes.tools.wishbook,
        icon: BookHeart,
        visible: true,
        key: 'wishbook',
    },
];

export function QuickAccessBar() {
    const t = useTranslations('FeedQuickAccessBar');
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();

    const enabledItems = useMemo(() => {
        if (!activeEvent) return [];

        const availableModules = new Set(activeEvent.modules.filter((module) => module.isAvailable).map((module) => module.moduleKey));

        return activeEvent.modules
            .filter((module) => module.isAvailable)
            .map((module) => {
                const item = quickAccessItems.find((entry) => entry.moduleKey === module.moduleKey && entry.visible);
                if (!item || !availableModules.has(item.moduleKey)) {
                    return null;
                }

                return item.moduleKey === 'rsvp' ? { ...item, href: isHost ? routes.tools.rsvp : routes.tools.rsvpSubmit } : item;
            })
            .filter((item): item is QuickAccessItem => !!item);
    }, [activeEvent, isHost]);

    if (enabledItems.length === 0) {
        return null;
    }

    return (
        <section aria-label={t('ariaLabel')} className="hidden px-4 pb-2 mt-4 lg:block">
            <div className="rounded-[1.5rem] border border-border bg-linear-to-r from-card via-surface-muted to-card p-3 shadow-[0_12px_28px_rgba(36,31,26,0.05)] sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">{t('eyebrow')}</p>
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
