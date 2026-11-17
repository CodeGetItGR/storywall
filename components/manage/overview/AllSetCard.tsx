import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';

/** Replaces the current card once every setup stop is done. */
export function AllSetCard({ printHref, aside }: { printHref: string; aside?: ReactNode }) {
    const t = useTranslations('ManagePage');
    return (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-linear-to-b from-[#fbe3ec] to-primary-light/40 p-6 text-center lg:flex-row lg:text-left">
            {/* Balloons */}
            <Image src="/icons/balloon.svg" alt={t('journey.allSet.title')} width={80} height={80} className="h-20 w-20 object-contain" unoptimized />

            {/* Text */}
            <div className="flex flex-1 flex-col items-center gap-1 lg:items-start">
                <h3 className="text-xl font-bold text-ink">{t('journey.allSet.title')}</h3>
                <p className="text-sm text-ink-muted">{t('journey.allSet.body')}</p>
                <AppLink
                    href={printHref}
                    className="mt-3 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-white hover:opacity-90"
                >
                    {t('journey.allSet.print')}
                </AppLink>
            </div>

            {/* Plan (desktop) */}
            {aside && <div className="hidden lg:block lg:w-64">{aside}</div>}
        </div>
    );
}
