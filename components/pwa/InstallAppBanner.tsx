'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { IosInstallGuide } from '@/components/pwa/IosInstallGuide';
import { useInstallBanner } from '@/hooks/useInstallBanner';

export function InstallAppBanner() {
    const t = useTranslations('InstallApp');
    const { state, dismiss, install, iosGuideOpen, closeIosGuide } = useInstallBanner();

    if (state === 'hidden') return null;

    return (
        <section className="mt-3 px-4">
            {state === 'tip' ? (
                /* Tip */
                <p role="status" className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">
                    {t('banner.tip')}
                </p>
            ) : (
                /* Offer */
                <div className="flex items-center gap-3 rounded-2xl bg-surface-muted py-2 pr-2 pl-3">
                    <Image src="/pwa/icon-192.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg" unoptimized />
                    <p className="min-w-0 flex-1 text-sm font-semibold text-ink">{t('banner.title')}</p>
                    <button
                        type="button"
                        onClick={install}
                        className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                    >
                        {t('install')}
                    </button>
                    <button
                        type="button"
                        onClick={dismiss}
                        aria-label={t('dismiss')}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-background hover:text-ink"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            )}

            <IosInstallGuide open={iosGuideOpen} onCloseAction={closeIosGuide} />
        </section>
    );
}
