'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { SettingsPencilButton } from '@/components/manage/settings/SettingsPencilButton';
import type { SettingsPart } from '@/lib/settingsPreview';
import { cn } from '@/lib/utils';

type SettingsPreviewRowProps = {
    part: SettingsPart;
    label: string;
    canEdit: boolean;
    selected: boolean;
    onEditAction: (part: SettingsPart) => void;
    children: ReactNode;
};

// One part of the invite preview as guests see it, with its pencil. Outlined while its editor is open.
export function SettingsPreviewRow({ part, label, canEdit, selected, onEditAction, children }: SettingsPreviewRowProps) {
    const t = useTranslations('ManagePage.sessionManagement');

    function handleEdit() {
        onEditAction(part);
    }

    return (
        <div
            className={cn(
                'flex items-start gap-2.5 rounded-[1rem] px-3 py-2.5 transition-colors',
                selected && 'bg-primary-light/50 outline-2 outline-primary',
            )}
        >
            <div className="min-w-0 flex-1">{children}</div>
            {canEdit && <SettingsPencilButton label={t('editNamed', { title: label })} selected={selected} onClick={handleEdit} />}
        </div>
    );
}
