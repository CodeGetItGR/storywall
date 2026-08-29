'use client';

import { Send } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { ModulePreviewFrame, type ModulePreviewProps } from '@/components/home/modulePreviews/previewFrame';

/** Replica of app/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx — the wishbook illustration and guest composer. */
export function WishbookPreview({ variant }: ModulePreviewProps) {
    const t = useTranslations('WishbookPage');
    const tHome = useTranslations('HomePage');

    return (
        <ModulePreviewFrame variant={variant}>
            {/* Header art */}
            <section className="flex flex-col items-center px-2 pt-6 text-center">
                <Image src="/icons/wishbook.svg" alt="" width={80} height={80} className="h-20 w-20" unoptimized />
            </section>

            {/* Composer */}
            <div className="mt-6 space-y-4 px-4 pb-6">
                <div className="min-h-44 w-full rounded-[1.5rem] border border-border/70 bg-background px-5 py-4 text-base leading-8 text-ink">
                    {tHome('modules.preview.wishbookMessage')}
                </div>
                <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-ink-faint">{t('charactersLeft', { current: 96, max: 2000 })}</span>
                    <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-brand px-4 text-sm font-semibold text-white">
                        <Send className="h-4 w-4" />
                        {t('addToWishbook')}
                    </span>
                </div>
            </div>
        </ModulePreviewFrame>
    );
}
