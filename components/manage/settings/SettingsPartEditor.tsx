'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { SettingsCoverForm } from '@/components/manage/settings/SettingsCoverForm';
import { SettingsScheduleForm } from '@/components/manage/settings/SettingsScheduleForm';
import { SettingsDescriptionForm, SettingsLocationForm, SettingsTitleForm } from '@/components/manage/settings/SettingsTextForms';
import { Modal } from '@/components/ui/modal';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { SettingsPart } from '@/lib/settingsPreview';

type SettingsPartEditorProps = {
    event: EventDetailResponseDto;
    part: SettingsPart | null;
    label: string;
    isDesktop: boolean;
    canUploadCover: boolean;
    onCloseAction: () => void;
};

// The editor for one part of the preview: a panel beside it on desktop, a bottom sheet on phones.
export function SettingsPartEditor({ event, part, label, isDesktop, canUploadCover, onCloseAction }: SettingsPartEditorProps) {
    const t = useTranslations('ManagePage.rsvpReport');
    const headingId = useId();

    if (isDesktop) {
        if (!part) return null;
        return (
            <section aria-labelledby={headingId} className="sticky top-6 flex flex-col gap-5 rounded-[1.625rem] bg-surface-muted p-6">
                {/* Heading */}
                <div className="flex items-center justify-between gap-3">
                    <h2 id={headingId} className="text-lg font-bold text-ink">
                        {label}
                    </h2>
                    <button
                        type="button"
                        onClick={onCloseAction}
                        aria-label={t('close')}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-background"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                {/* Fields */}
                <SettingsPartForm key={part} event={event} part={part} label={label} canUploadCover={canUploadCover} onSavedAction={onCloseAction} />
            </section>
        );
    }

    return (
        <Modal open={part !== null} onClose={onCloseAction} closeLabel={t('close')} variant="sheet" size="sm" labelledBy={headingId}>
            <Modal.Body className="flex flex-col gap-4 px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
                {/* Heading */}
                <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-border" />
                <h2 id={headingId} className="pr-10 text-lg font-bold text-ink">
                    {label}
                </h2>

                {/* Fields */}
                {part && <SettingsPartForm key={part} event={event} part={part} label={label} canUploadCover={canUploadCover} onSavedAction={onCloseAction} />}
            </Modal.Body>
        </Modal>
    );
}

type SettingsPartFormProps = {
    event: EventDetailResponseDto;
    part: SettingsPart;
    label: string;
    canUploadCover: boolean;
    onSavedAction: () => void;
};

function SettingsPartForm({ event, part, label, canUploadCover, onSavedAction }: SettingsPartFormProps) {
    switch (part) {
        case 'cover':
            return <SettingsCoverForm event={event} canUpload={canUploadCover} onSavedAction={onSavedAction} />;
        case 'title':
            return <SettingsTitleForm event={event} label={label} onSavedAction={onSavedAction} />;
        case 'date':
            return <SettingsScheduleForm event={event} label={label} onSavedAction={onSavedAction} />;
        case 'location':
            return <SettingsLocationForm event={event} label={label} onSavedAction={onSavedAction} />;
        case 'description':
            return <SettingsDescriptionForm event={event} label={label} onSavedAction={onSavedAction} />;
    }
}
