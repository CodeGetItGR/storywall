import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export function DemoEventStatusPill({ hasDemo }: { hasDemo: boolean }) {
    const t = useTranslations('AdminPage.demoEvents');

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
                hasDemo ? 'bg-status-good-wash text-status-good' : 'bg-status-neutral-wash text-status-neutral',
            )}
        >
            <span className={cn('h-1.5 w-1.5 rounded-full', hasDemo ? 'bg-status-good' : 'bg-status-neutral')} />
            {hasDemo ? t('statusSet') : t('statusNone')}
        </span>
    );
}
