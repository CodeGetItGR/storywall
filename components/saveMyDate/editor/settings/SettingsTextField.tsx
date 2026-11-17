'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { FIELD_CLASS, SettingsHint } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { useSettingsTextField } from '@/hooks/useSettingsTextField';
import { cn } from '@/lib/utils';

type SettingsTextFieldProps = {
    label: string;
    value: string;
    onSave: (value: string) => void;
    // Checked as a web, mail, phone or text-message link when left.
    isLink?: boolean;
    hint?: string;
    type?: 'text' | 'url' | 'tel' | 'email';
    multiline?: boolean;
    maxLength?: number;
};

// A text or link setting, saved when the field is left.
export function SettingsTextField({
    label,
    value,
    onSave,
    isLink = false,
    hint,
    type = 'text',
    multiline = false,
    maxLength,
}: SettingsTextFieldProps) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const id = useId();
    const hintId = useId();
    const field = useSettingsTextField(value, onSave, { isLink });
    const shared = {
        id,
        value: field.value,
        onChange: field.onChange,
        onBlur: field.onBlur,
        maxLength,
        'aria-invalid': field.isInvalid || undefined,
        'aria-describedby': field.isInvalid || hint ? hintId : undefined,
    };

    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            {/* Label */}
            <label htmlFor={id} className="text-[13px] leading-tight">
                {label}
            </label>

            {/* Field */}
            {multiline ? (
                <textarea {...shared} rows={3} className={cn(FIELD_CLASS, 'h-auto py-2 leading-snug')} />
            ) : (
                <input {...shared} type={isLink ? 'url' : type} inputMode={isLink ? 'url' : undefined} autoComplete="off" className={FIELD_CLASS} />
            )}

            {/* Hint or problem */}
            {field.isInvalid ? (
                <SettingsHint id={hintId} tone="error">
                    {t('invalidLink')}
                </SettingsHint>
            ) : (
                hint && <SettingsHint id={hintId}>{hint}</SettingsHint>
            )}
        </div>
    );
}
