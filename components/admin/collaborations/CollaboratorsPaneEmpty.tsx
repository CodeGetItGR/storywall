'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function CollaboratorsPaneEmpty({ onCreateAction }: { onCreateAction: () => void }) {
    const t = useTranslations('AdminPage.collaborations');

    return (
        <div className="min-w-0 flex-1 space-y-3 py-6">
            {/* Empty */}
            <p className="text-sm text-ink-muted">{t('empty')}</p>
            <button
                type="button"
                onClick={onCreateAction}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary/30"
            >
                <Plus className="h-4 w-4" />
                {t('create')}
            </button>
        </div>
    );
}
