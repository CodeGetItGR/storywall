'use client';

import { useTranslations } from 'next-intl';

export type FunnelWindow = 'signup' | 'payment' | 'none';

export function FunnelWindowTag({ window }: { window: FunnelWindow }) {
    const t = useTranslations('AdminPage.funnel.window');

    return (
        <span className="inline-flex items-center rounded-full bg-status-neutral-wash px-2 py-0.5 text-[11px] font-semibold text-status-neutral">
            {t(window)}
        </span>
    );
}
