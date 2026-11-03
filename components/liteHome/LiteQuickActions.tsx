'use client';

import { useTranslations } from 'next-intl';

import { GuestCodeSheet } from '@/components/liteHome/GuestCodeSheet';
import { LiteActionIcon } from '@/components/liteHome/LiteActionIcon';
import { AppLink } from '@/components/ui/AppLink';
import type { LiteHomeState } from '@/hooks/useLiteHome';
import { useLiteQuickActions } from '@/hooks/useLiteQuickActions';

const TILE_CLASS = 'flex w-20 flex-col items-center gap-1.5 rounded-2xl px-1 py-1.5 focus-ring transition-colors hover:bg-surface-muted';
const LABEL_CLASS = 'line-clamp-2 text-center text-xs leading-tight font-medium text-ink';

// The host's quick actions on a lite event's home, as small tiles scrolling sideways.
export function LiteQuickActions({ home }: { home: LiteHomeState }) {
    const t = useTranslations('LiteHome');
    const { qrOpen, closeQr, copied, handlers } = useLiteQuickActions(home);

    return (
        <section aria-labelledby="lite-quick-actions-title" className="mt-5">
            {/* Title */}
            <h2 id="lite-quick-actions-title" className="px-4 text-sm font-semibold text-ink">
                {t('actionsTitle')}
            </h2>

            {/* Actions */}
            <ul className="mt-2 no-scrollbar flex gap-1 overflow-x-auto px-2.5">
                {home.actions.map((action) => {
                    const done = action === 'share' && copied;
                    const label = done ? t('shareCopied') : t(`actions.${action}`);
                    return (
                        <li key={action} className="shrink-0">
                            {action === 'upgrade' && home.upgradeHref ? (
                                <AppLink href={home.upgradeHref} className={TILE_CLASS}>
                                    <LiteActionIcon action={action} />
                                    <span className={LABEL_CLASS}>{label}</span>
                                </AppLink>
                            ) : (
                                <button type="button" onClick={handlers[action]} className={TILE_CLASS}>
                                    <LiteActionIcon action={action} done={done} />
                                    <span className={LABEL_CLASS} aria-live={action === 'share' ? 'polite' : undefined}>
                                        {label}
                                    </span>
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>

            {/* Guest code */}
            {home.guestLink && <GuestCodeSheet open={qrOpen} eventId={home.event.id} guestLink={home.guestLink} onCloseAction={closeQr} />}
        </section>
    );
}
