'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SECONDARY_BUTTON } from '@/components/saveMyDate/storefront/storefrontStyles';
import { cn } from '@/lib/utils';

type StorefrontMessageProps = {
    message: string;
    // Shown as "Try again" when there is one.
    onRetry?: () => void;
};

// One plain line in place of the cards or the theme: nothing found, or a load that failed.
export function StorefrontMessage({ message, onRetry }: StorefrontMessageProps) {
    const t = useTranslations('PageErrorState');

    return (
        <div className="flex flex-col items-center gap-4 py-16 text-center" role={onRetry ? 'alert' : 'status'}>
            <p className="m-0 text-[17px] text-[#151313]/75">{message}</p>
            {onRetry ? (
                <button className={cn(SECONDARY_BUTTON, 'gap-2')} type="button" onClick={onRetry}>
                    <RefreshCw aria-hidden className="size-4" />
                    {t('retry')}
                </button>
            ) : null}
        </div>
    );
}
