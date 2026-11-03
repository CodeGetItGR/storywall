'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

type GuestCodeAction = 'upload' | 'wish';

interface GuestCodeChooserProps {
    onChoose: (action: GuestCodeAction) => void;
}

const BUTTON_CLASS =
    'flex w-full items-center justify-center rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90';

export function GuestCodeChooser({ onChoose }: GuestCodeChooserProps) {
    const t = useTranslations('QrCodePage');
    const tAlt = useTranslations('ImageAlt');

    const handleChoose = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            onChoose(event.currentTarget.dataset.action as GuestCodeAction);
        },
        [onChoose],
    );

    return (
        <div className="flex flex-col gap-8">
            {/* Upload */}
            <div className="flex flex-col items-center gap-4 text-center">
                <Image src="/icons/post.svg" alt={tAlt('photoUpload')} width={80} height={80} className="h-20 w-20" unoptimized />
                <p className="text-base text-ink">{t('guestCode.uploadLine')}</p>
                <button type="button" data-action="upload" onClick={handleChoose} className={BUTTON_CLASS}>
                    {t('guestCode.uploadButton')}
                </button>
            </div>

            {/* Or */}
            <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-ink-faint uppercase">{t('guestCode.or')}</span>
                <span className="h-px flex-1 bg-border" />
            </div>

            {/* Wish */}
            <div className="flex flex-col items-center gap-4 text-center">
                <Image src="/icons/wishbook.svg" alt={tAlt('wishbook')} width={80} height={80} className="h-20 w-20" unoptimized />
                <p className="text-base text-ink">{t('guestCode.wishLine')}</p>
                <button type="button" data-action="wish" onClick={handleChoose} className={BUTTON_CLASS}>
                    {t('guestCode.wishButton')}
                </button>
            </div>
        </div>
    );
}
