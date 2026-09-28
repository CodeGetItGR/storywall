import { useTranslations } from 'next-intl';

import type { ErrorEventSource } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const SOURCE_STYLES: Record<ErrorEventSource, string> = {
    BACKEND: 'bg-status-danger-wash text-status-danger',
    BACKGROUND: 'bg-status-warn-wash text-status-warn',
    CLIENT: 'bg-status-neutral-wash text-status-neutral',
};

export function ErrorSourcePill({ source }: { source: ErrorEventSource }) {
    const t = useTranslations('AdminPage.errorEvents.sources');
    return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', SOURCE_STYLES[source])}>{t(source)}</span>;
}
