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
            <h2 className="text-sm font-bold text-ink mb-3">{t('whosComing')}</h2>
            <div className="flex flex-col gap-2">
                {guests.map((guest) => (
                    <div key={guest.id} className="flex items-center justify-between bg-card rounded-xl px-4 py-3 border border-border/50 shadow-sm">
                        <div>
                            <p className="text-sm font-medium text-ink">{guest.name}</p>
                            {guest.notes && <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">&ldquo;{guest.notes}&rdquo;</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {guest.adultCount + guest.childCount > 1 && (
                                <span className="text-xs text-ink-muted bg-surface-muted px-2 py-0.5 rounded-full">
                                    +{guest.adultCount + guest.childCount - 1}
                                </span>
                            )}
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
