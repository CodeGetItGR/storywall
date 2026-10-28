import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export function PhonePushPill({ enabled }: { enabled: boolean }) {
    const t = useTranslations('AdminPage.phones.push');

    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold',
                enabled ? 'bg-status-good-wash text-status-good' : 'bg-status-neutral-wash text-status-neutral',
            )}
        >
            {t(enabled ? 'on' : 'off')}
        </span>
    );
}
