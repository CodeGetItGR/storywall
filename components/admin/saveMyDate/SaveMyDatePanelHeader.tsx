'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

// A Save my date screen's heading, with its one create button.
export function SaveMyDatePanelHeader({ title, createLabel, onCreateAction }: { title: string; createLabel: string; onCreateAction: () => void }) {
    const tAdmin = useTranslations('AdminPage');

    return (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
                <p className="text-[11px] font-bold tracking-[0.14em] text-primary-dark uppercase">{tAdmin('eyebrow')}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
            </div>
            <button
                type="button"
                onClick={onCreateAction}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
            >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {createLabel}
            </button>
        </header>
    );
}
