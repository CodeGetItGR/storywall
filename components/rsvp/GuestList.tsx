'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { RsvpResponseDto } from '@/lib/api/types';

interface ConfirmedGuest extends RsvpResponseDto {
    name: string;
}

export function GuestList({ guests }: { guests: ConfirmedGuest[] }) {
    const t = useTranslations('RSVPPage');

    return (
        <>
            <h2 className="mb-3 text-sm font-bold text-ink">{t('whosComing')}</h2>
            <div className="flex flex-col gap-2">
                {guests.map((guest) => (
                    <div key={guest.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3 shadow-sm">
                        <div>
                            <p className="text-sm font-medium text-ink">{guest.name}</p>
                            {guest.notes && <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">&ldquo;{guest.notes}&rdquo;</p>}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                            {guest.adultCount + guest.childCount > 1 && (
                                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">
                                    +{guest.adultCount + guest.childCount - 1}
                                </span>
                            )}
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
