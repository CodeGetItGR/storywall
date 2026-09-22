'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { readableModuleKeys } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';

export function EventDeletedBanner({ event }: { event: EventDetailResponseDto }) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const date = event.deletionScheduledFor ? formatDate(locale, event.deletionScheduledFor, { dateStyle: 'long' }) : null;
    const readable = readableModuleKeys(event);
    const links = [
        { key: 'gallery', href: routes.events.tools.gallery(event.id), label: t('settings.deleted.galleryLink'), show: readable.has('gallery') },
        { key: 'wishbook', href: routes.events.tools.wishbook(event.id), label: t('settings.deleted.wishbookLink'), show: readable.has('wishbook') },
    ].filter((link) => link.show);

    return (
        <>
            {/* Deleted */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-center">
                <p className="text-sm font-semibold text-rose-700">{t('settings.deleted.title')}</p>
                {date && <p className="mt-1 text-xs leading-relaxed text-rose-700/80">{t('settings.deleted.body', { date })}</p>}
                {links.length > 0 && (
                    <div className="mt-4 flex justify-center gap-2">
                        {links.map((link) => (
                            <Link
                                key={link.key}
                                href={link.href}
                                className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
