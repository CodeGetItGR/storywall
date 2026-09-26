'use client';

import { Check, Clock, type LucideIcon, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { type RsvpDisplayStatus, rsvpStatusTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

const statusIcon: Record<RsvpDisplayStatus, LucideIcon> = {
    ATTENDING: Check,
    DECLINED: X,
    NO_RESPONSE: Clock,
};

export function RsvpStatusPill({ status, className }: { status: RsvpDisplayStatus; className?: string }) {
    const t = useTranslations('ManagePage');
    const Icon = statusIcon[status];
    const hint = t(`rsvpStatusHint.${status}`);

    return (
        <span
            title={hint}
            aria-label={hint}
            className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
                rsvpStatusTone[status],
                className,
            )}
        >
            <Icon aria-hidden className="h-3 w-3" strokeWidth={2.5} />
            {t(`rsvpStatus.${status}`)}
        </span>
    );
}
