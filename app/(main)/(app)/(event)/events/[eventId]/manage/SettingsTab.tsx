'use client';

import { useTranslations } from 'next-intl';

import { SettingsPartEditor } from '@/components/manage/settings/SettingsPartEditor';
import { SettingsPreview } from '@/components/manage/settings/SettingsPreview';
import { useSettingsPreview } from '@/hooks/useSettingsPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';

// Settings (KAN-228, S2): the event details as guests see them, each part edited on its own.
export default function SettingsTab({
    event,
    canWrite,
    canUploadCover = canWrite,
}: {
    event: EventDetailResponseDto;
    canWrite: boolean;
    canUploadCover?: boolean;
}) {
    const t = useTranslations('ManagePage');
    const view = useSettingsPreview(event, canWrite, canUploadCover);

    return (
        <div className="flex flex-col gap-4">
            {/* Intro */}
            <p className="text-sm text-ink-muted">{t('settings.subtitle')}</p>
            {!canWrite && <p className="rounded-[1rem] bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">{t('settings.readOnly')}</p>}

            <div className="flex flex-col gap-8 pb-20 lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:pb-0">
                {/* Invite preview */}
                <SettingsPreview
                    event={event}
                    parts={view.parts}
                    labels={view.labels}
                    openPart={view.openPart}
                    canEdit={view.canEdit}
                    canWrite={canWrite}
                    startText={view.startText}
                    endText={view.endText}
                    onEditAction={view.openEditor}
                />

                {/* Editor */}
                <SettingsPartEditor
                    event={event}
                    part={view.openPart}
                    label={view.openPart ? view.labels[view.openPart] : ''}
                    isDesktop={view.isDesktop}
                    canUploadCover={view.canUploadCover}
                    onCloseAction={view.closeEditor}
                />
            </div>
        </div>
    );
}
