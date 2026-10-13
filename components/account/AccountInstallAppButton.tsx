'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { IosInstallGuide } from '@/components/pwa/IosInstallGuide';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function AccountInstallAppButton() {
    const t = useTranslations('InstallApp');
    const { canInstall, install, iosGuideOpen, closeIosGuide } = usePwaInstall();

    if (!canInstall && !iosGuideOpen) return null;

    return (
        <>
            <button
                type="button"
                onClick={install}
                className="flex min-h-11 items-center gap-3 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white/88 ring-1 ring-white/14 transition-[background-color,transform] hover:bg-white/16 hover:text-white active:scale-[0.99]"
            >
                <Download className="h-5 w-5 shrink-0 text-white/80" aria-hidden="true" strokeWidth={1.8} />
                <span className="truncate">{t('menuItem')}</span>
            </button>

            <IosInstallGuide open={iosGuideOpen} onCloseAction={closeIosGuide} />
        </>
    );
}
