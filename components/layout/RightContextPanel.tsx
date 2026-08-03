'use client';

import { LayoutDashboard, MessageSquareText, Settings2, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

const hostLinks = [
    { key: 'manage', href: '/manage', icon: LayoutDashboard },
    { key: 'rsvps', href: '/tools/rsvp', icon: Ticket },
    { key: 'invitations', href: '/manage?tab=invitations', icon: MessageSquareText },
    { key: 'settings', href: '/manage?tab=settings', icon: Settings2 },
] as const;

export function RightContextPanel() {
    const t = useTranslations('RightContextPanel');
    const locale = useLocale();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();

    if (isLoading || !activeEvent || !isHost) return null;

    const eventDate = new Date(activeEvent.schedule.startAt);
    const eventDateLabel = eventDate.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    const enabledModuleCount = activeEvent.modules.filter((module) => module.isEnabled).length;

    return (
        <aside
            aria-label={t('hostConsole')}
            className="fixed right-0 top-0 z-30 hidden h-screen w-75 flex-col overflow-y-auto border-l border-border bg-background no-scrollbar xl:flex"
        >
            <div className="flex flex-col gap-5 p-5">
                <div className="rounded-[1.5rem] border border-border bg-gradient-to-b from-surface-muted to-card p-4 shadow-[0_12px_30px_rgba(36,31,26,0.05)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">{t('hostConsole')}</p>
                    <h2 className="mt-2 text-lg font-semibold leading-tight text-ink text-balance">{activeEvent.title}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{eventDateLabel}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-background/70 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">{t('hostQuickLinks')}</p>
                            <p className="mt-1 text-sm font-medium text-ink">{t('dashboard')}</p>
                        </div>
                        <div className="rounded-2xl bg-background/70 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">{t('activeModules')}</p>
                            <p className="mt-1 text-sm font-medium text-ink tabular-nums">{enabledModuleCount}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-sm font-semibold text-ink">{t('hostActions')}</p>
                    <div className="space-y-2">
                        {hostLinks.map(({ key, href, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_10px_24px_rgba(36,31,26,0.06)]"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-muted transition-colors group-hover:bg-primary-light group-hover:text-primary-dark">
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-ink">{t(`links.${key}`)}</span>
                                    <span className="block text-xs text-ink-muted">{t(`helper.${key}`)}</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

            </div>
        </aside>
    );
}
