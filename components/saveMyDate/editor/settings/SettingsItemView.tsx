'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

type SettingsItemViewProps = {
    title: string;
    onDone: () => void;
    children: ReactNode;
};

// One item's settings, open in place of the list until Done.
export function SettingsItemView({ title, onDone, children }: SettingsItemViewProps) {
    const t = useTranslations('InvitationEditor.sectionSettings');

    return (
        <div role="group" aria-label={title} className="flex flex-col gap-3 rounded-[12px] bg-white/[0.03] p-2.5">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h4 className="text-[13px] font-bold text-(--smd-editor-strong)">{title}</h4>
                <button
                    type="button"
                    onClick={onDone}
                    className="h-9 rounded-lg px-3 text-[13px] font-semibold text-(--smd-editor-accent) hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                    {t('done')}
                </button>
            </div>

            {/* Fields */}
            {children}
        </div>
    );
}
