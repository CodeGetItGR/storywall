'use client';

import { Popover } from '@base-ui/react/popover';
import { CircleHelp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { OutreachStatusPill } from '@/components/admin/outreach/OutreachStatusPill';
import { OUTREACH_STATUSES } from '@/lib/adminOutreach';

// One line per status saying when to use it.
export function OutreachStatusHelp() {
    const t = useTranslations('AdminPage.outreach.statusHelp');

    return (
        <Popover.Root>
            {/* Trigger */}
            <Popover.Trigger className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/30">
                <CircleHelp aria-hidden="true" className="h-4 w-4" />
                {t('trigger')}
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Positioner side="bottom" align="end" sideOffset={6} className="z-40">
                    <Popover.Popup className="admin-shell w-[min(380px,calc(100vw-32px))] rounded-xl border border-border bg-card p-4 text-ink shadow-[0_20px_50px_-20px_rgba(18,20,28,0.4)] outline-none">
                        {/* Title */}
                        <Popover.Title className="text-sm font-bold text-ink">{t('title')}</Popover.Title>

                        {/* Statuses */}
                        <dl className="mt-3 space-y-2.5">
                            {OUTREACH_STATUSES.map((status) => (
                                <div key={status} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3">
                                    <dt>
                                        <OutreachStatusPill status={status} />
                                    </dt>
                                    <dd className="text-[13px] leading-5 text-ink-muted">{t(status)}</dd>
                                </div>
                            ))}
                        </dl>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
