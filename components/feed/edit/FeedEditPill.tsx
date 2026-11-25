'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Ref } from 'react';

// The feed's Edit pill: hosts and co-hosts only.
export function FeedEditPill({ onClick, ref }: { onClick: () => void; ref?: Ref<HTMLButtonElement> }) {
    const t = useTranslations('FeedEditor');

    return (
        <button
            ref={ref}
            type="button"
            onClick={onClick}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-background/92 px-3.5 text-sm font-semibold text-ink shadow-[0_8px_22px_rgba(36,31,26,0.18)] transition-transform hover:-translate-y-0.5"
        >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {t('edit')}
        </button>
    );
}
