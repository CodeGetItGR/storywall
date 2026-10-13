'use client';

import { Check, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ShareInviteTabProps {
    copied: boolean;
    onShare: () => void;
}

export function ShareInviteTab({ copied, onShare }: ShareInviteTabProps) {
    const t = useTranslations('MobileTabBar');
    const Icon = copied ? Check : Share2;

    return (
        <button
            type="button"
            onClick={onShare}
            aria-label={copied ? t('inviteCopied') : t('shareInvite')}
            className="flex h-full w-full items-center justify-center transition-colors hover:bg-surface-muted"
        >
            <span className="flex h-10 w-10 scale-100 items-center justify-center opacity-50 transition-all duration-200">
                <Icon className="h-5.5 w-5.5 text-ink" aria-hidden="true" />
            </span>
        </button>
    );
}
