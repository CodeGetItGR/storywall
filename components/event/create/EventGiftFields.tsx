'use client';

import { useTranslations } from 'next-intl';

import { GiftDetailsFields } from '@/components/giftMode/GiftDetailsFields';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// "Buy as a gift", on plans that can be given.
export function EventGiftFields() {
    const t = useTranslations('CreateEventPage');
    const { gift } = useCreateEventForm();

    if (!gift.available) return null;

    return (
        <div className="space-y-4 border-t border-border/70 pt-4">
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
                <input type="checkbox" checked={gift.enabled} onChange={gift.handleToggle} className="mt-0.5 h-4 w-4 accent-primary" />
                <span>
                    <span className="block text-sm font-semibold text-ink">{t('gift.toggle')}</span>
                    <span className="mt-0.5 block text-xs text-ink-muted">{t('gift.toggleHint')}</span>
                </span>
            </label>
            {gift.enabled && <GiftDetailsFields value={gift.details.value} onChangeAction={gift.details.handleChange} />}
        </div>
    );
}
