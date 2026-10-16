'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export function ReviewSent({ onCloseAction }: { onCloseAction: () => void }) {
    const t = useTranslations('ReviewPrompt');

    return (
        <div className="flex flex-col gap-5">
            {/* Message */}
            <p className="pr-10 text-lg font-bold text-ink">{t('sent')}</p>

            {/* Actions */}
            <div className="flex justify-end">
                <Button type="button" size="lg" onClick={onCloseAction}>
                    {t('close')}
                </Button>
            </div>
        </div>
    );
}
