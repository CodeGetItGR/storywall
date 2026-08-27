'use client';

import { Copy } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { ModulePreviewFrame, type ModulePreviewProps } from '@/components/home/modulePreviews/previewFrame';

/** Replica of components/gifts/GiftAccountPage.tsx — the present illustration, note, and bank details. */
export function WishlistPreview({ variant }: ModulePreviewProps) {
    const t = useTranslations('GiftsPage');
    const tHome = useTranslations('HomePage');

    return (
        <ModulePreviewFrame variant={variant}>
            {/* Hero */}
            <section className="flex shrink-0 flex-col items-center px-2 pt-4 text-center">
                <Image src="/icons/present.svg" alt="" width={80} height={80} className="h-20 w-20" />
                <p className="mt-4 text-[1.08rem] leading-8 text-ink-muted">{tHome('modules.preview.giftNote')}</p>
            </section>

            {/* Bank details */}
            <section className="mt-5 shrink-0 border-t border-border/70 pt-6 pb-6 text-center">
                <div className="space-y-5">
                    <div>
                        <p className="text-sm font-semibold tracking-[0.18em] text-ink-faint uppercase">{t('fields.bankName')}</p>
                        <p className="mt-2 min-h-6 text-2xl font-semibold tracking-tight text-ink">Alpha Bank</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold tracking-[0.18em] text-ink-faint uppercase">{t('fields.iban')}</p>
                        <p className="mt-3 font-mono text-2xl font-semibold tracking-[0.12em] break-all text-ink">GR16 0110 1250 0000</p>
                    </div>
                    <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-muted px-4 text-sm font-semibold text-ink-muted">
                        <Copy className="h-4 w-4" />
                        {t('copyIban')}
                    </span>
                </div>
            </section>
        </ModulePreviewFrame>
    );
}
