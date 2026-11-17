'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useId } from 'react';

import { SettingsGroup, SettingsInput, SettingsRow } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { TextFontPicker } from '@/components/saveMyDate/editor/text/TextFontPicker';
import { useStyleNumberField } from '@/hooks/useStyleNumberField';
import { colorInputValue } from '@/lib/invitation/colorInput';
import { type StyleField, type StyleFieldGroup, visibleStyleGroups } from '@/lib/invitation/sectionStyleFields';
import { type FontOption, sameFont, THEME_FONT } from '@/lib/invitation/textEditing';

type StyleFieldsProps = {
    groups: StyleFieldGroup[];
    values: Record<string, unknown> | undefined;
    isAdmin: boolean;
    fonts: FontOption[];
    // Undefined clears the field, so it follows the theme again.
    onChange: (key: string, value: string | number | undefined) => void;
};

// A section's style settings, group by group.
export function StyleFields({ groups, values, isAdmin, fonts, onChange }: StyleFieldsProps) {
    const t = useTranslations('InvitationEditor');

    return visibleStyleGroups(groups, isAdmin).map((group, index) => (
        <SettingsGroup key={group.label ?? index} title={group.label ? t(group.label) : undefined}>
            {group.fields.map((field) => (
                <StyleFieldRow key={field.key} field={field} value={values?.[field.key]} fonts={fonts} onChange={onChange} />
            ))}
        </SettingsGroup>
    ));
}

type StyleFieldRowProps = {
    field: StyleField;
    value: unknown;
    fonts: FontOption[];
    onChange: StyleFieldsProps['onChange'];
};

function StyleFieldRow({ field, value, fonts, onChange }: StyleFieldRowProps) {
    const change = useCallback((next: string | number | undefined) => onChange(field.key, next), [field.key, onChange]);
    if (field.kind === 'font')
        return <FontField field={field} value={typeof value === 'string' ? value : undefined} fonts={fonts} onChange={change} />;
    if (field.kind === 'color') return <ColorField field={field} value={typeof value === 'string' ? value : undefined} onChange={change} />;
    return <NumberField field={field} value={typeof value === 'number' ? value : undefined} onChange={change} />;
}

type FieldProps<T> = { field: StyleField; value: T | undefined; onChange: (value: T | undefined) => void };

function FontField({ field, value, fonts, onChange }: FieldProps<string> & { fonts: FontOption[] }) {
    const t = useTranslations('InvitationEditor');
    const current = value ?? THEME_FONT;
    const label = value ? (fonts.find((option) => sameFont(option.value, value))?.label ?? value) : undefined;
    const pick = useCallback((font: string) => onChange(font === THEME_FONT ? undefined : font), [onChange]);

    return (
        <SettingsRow label={t(field.label)}>
            <TextFontPicker value={current} label={label} options={fonts} onChange={pick} />
        </SettingsRow>
    );
}

function ColorField({ field, value, onChange }: FieldProps<string>) {
    const t = useTranslations('InvitationEditor');
    const id = useId();
    const change = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value), [onChange]);
    const reset = useCallback(() => onChange(undefined), [onChange]);

    return (
        <SettingsRow label={t(field.label)} htmlFor={id}>
            <div className="flex shrink-0 items-center gap-1.5">
                {value !== undefined && (
                    <button
                        type="button"
                        onClick={reset}
                        className="h-9 rounded-lg px-2 text-[12px] text-(--smd-editor-muted) hover:bg-white/10 hover:text-(--smd-editor-text) focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                        {t('lineHeightDefault')}
                    </button>
                )}
                <input
                    id={id}
                    type="color"
                    value={colorInputValue(value, field.fallback)}
                    onChange={change}
                    className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-transparent p-0.5"
                />
            </div>
        </SettingsRow>
    );
}

function NumberField({ field, value, onChange }: FieldProps<number>) {
    const t = useTranslations('InvitationEditor');
    const id = useId();
    const number = useStyleNumberField(field, value, onChange);

    return (
        <SettingsRow label={t(field.label)} htmlFor={id}>
            <SettingsInput
                id={id}
                type="number"
                inputMode="numeric"
                min={field.min}
                max={field.max}
                placeholder={field.placeholder === undefined ? undefined : String(field.placeholder)}
                value={number.text}
                onChange={number.onChange}
                onBlur={number.onBlur}
                className="w-20 shrink-0 text-right"
            />
        </SettingsRow>
    );
}
