'use client';

import { useTranslations } from 'next-intl';

import { settingsInputClass, settingsLabelClass } from '@/components/manage/settings/settingsFieldStyles';
import { SettingsSaveButton } from '@/components/manage/settings/SettingsSaveButton';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useSettingsDescriptionForm, useSettingsLocationForm, useSettingsTitleForm } from '@/hooks/useSettingsTextForms';
import type { EventDetailResponseDto } from '@/lib/api/types';

type FormProps = { event: EventDetailResponseDto; label: string; onSavedAction: () => void };

// The title editor.
export function SettingsTitleForm({ event, label, onSavedAction }: FormProps) {
    const form = useSettingsTitleForm({ event, onSaved: onSavedAction });

    return (
        <form onSubmit={form.handleSubmit} className="flex flex-col gap-5">
            {/* Title */}
            <FormFieldLabel label={label} required labelClassName={settingsLabelClass}>
                <input
                    type="text"
                    required
                    maxLength={form.maxLength}
                    value={form.title}
                    onChange={form.handleTitleChange}
                    className={settingsInputClass}
                />
            </FormFieldLabel>

            {/* Save */}
            <SettingsSaveButton canSave={form.canSave} isSaving={form.isSaving} errorMessage={form.errorMessage} />
        </form>
    );
}

// The description editor.
export function SettingsDescriptionForm({ event, label, onSavedAction }: FormProps) {
    const t = useTranslations('ManagePage.settings');
    const form = useSettingsDescriptionForm({ event, onSaved: onSavedAction });

    return (
        <form onSubmit={form.handleSubmit} className="flex flex-col gap-5">
            {/* Description */}
            <FormFieldLabel label={label} optional labelClassName={settingsLabelClass}>
                <textarea
                    value={form.description}
                    onChange={form.handleDescriptionChange}
                    placeholder={t('placeholders.description')}
                    rows={5}
                    maxLength={form.maxLength}
                    className={`${settingsInputClass} resize-none leading-relaxed`}
                />
                <span className="text-right text-xs text-ink-faint">
                    {form.description.length}/{form.maxLength}
                </span>
            </FormFieldLabel>

            {/* Save */}
            <SettingsSaveButton canSave={form.canSave} isSaving={form.isSaving} errorMessage={form.errorMessage} />
        </form>
    );
}

// The location editor: the place's name, address and maps link.
export function SettingsLocationForm({ event, label, onSavedAction }: FormProps) {
    const t = useTranslations('ManagePage.settings');
    const form = useSettingsLocationForm({ event, onSaved: onSavedAction });

    return (
        <form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
            {/* Place */}
            <FormFieldLabel label={label} required labelClassName={settingsLabelClass}>
                <input
                    type="text"
                    required
                    maxLength={form.limits.locationNameMaxLength}
                    value={form.locationName}
                    onChange={form.handleLocationNameChange}
                    className={settingsInputClass}
                />
            </FormFieldLabel>

            {/* Address */}
            <FormFieldLabel label={t('fields.locationAddress')} required labelClassName={settingsLabelClass}>
                <input
                    type="text"
                    required
                    maxLength={form.limits.locationAddressMaxLength}
                    value={form.locationAddress}
                    onChange={form.handleLocationAddressChange}
                    placeholder={t('placeholders.locationAddress')}
                    className={settingsInputClass}
                />
            </FormFieldLabel>

            {/* Maps link */}
            <FormFieldLabel label={t('fields.mapsUrl')} optional labelClassName={settingsLabelClass}>
                <input
                    type="url"
                    maxLength={form.limits.urlMaxLength}
                    value={form.mapsUrl}
                    onChange={form.handleMapsUrlChange}
                    placeholder={t('placeholders.mapsUrl')}
                    className={settingsInputClass}
                />
            </FormFieldLabel>

            {/* Save */}
            <SettingsSaveButton canSave={form.canSave} isSaving={form.isSaving} errorMessage={form.errorMessage} />
        </form>
    );
}
