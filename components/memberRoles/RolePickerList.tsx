'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import type { Locale } from '@/i18n/config';
import type { MemberRoleOptionDto } from '@/lib/api/types';
import { isOptionDisabled, optionLabel, OTHER_CHOICE, type RolePickerDraft } from '@/lib/memberRoles';
import { cn } from '@/lib/utils';

export function RolePickerList({
    options,
    allowCustom,
    customLocked,
    lockedRoleLabel = null,
    hostOnlyKeys,
    currentRoleKey,
    draft,
    customMaxLength,
    onChoiceChangeAction,
    onCustomTextChangeAction,
}: {
    options: MemberRoleOptionDto[];
    allowCustom: boolean;
    customLocked: boolean;
    lockedRoleLabel?: string | null;
    hostOnlyKeys?: ReadonlySet<string>;
    currentRoleKey: string | null;
    draft: RolePickerDraft;
    customMaxLength: number;
    onChoiceChangeAction: (choice: string) => void;
    onCustomTextChangeAction: (text: string) => void;
}) {
    const t = useTranslations('MemberRoles');
    const locale = useLocale() as Locale;
    const locked = lockedRoleLabel !== null;
    const otherSelected = draft.choice === OTHER_CHOICE;
    const otherDisabled = customLocked || locked;

    function handleChoiceChange(event: ChangeEvent<HTMLInputElement>) {
        onChoiceChangeAction(event.currentTarget.value);
    }

    function handleCustomTextChange(event: ChangeEvent<HTMLInputElement>) {
        onCustomTextChangeAction(event.currentTarget.value);
    }

    return (
        <fieldset className="flex flex-col">
            <legend className="sr-only">{t('myRole')}</legend>

            {/* Held role */}
            {locked && (
                <div className="border-b border-border/60 px-1 py-2">
                    <label className="flex min-h-8 items-center gap-3">
                        <input type="radio" name="member-role" checked readOnly disabled className="h-4 w-4 accent-primary" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{lockedRoleLabel}</span>
                    </label>
                    <p className="pl-7 text-xs text-ink-muted">{t('setByHosts')}</p>
                </div>
            )}

            {/* Roles */}
            {options.map((option) => {
                const full = isOptionDisabled(option, currentRoleKey);
                const disabled = locked || full;
                return (
                    <label
                        key={option.roleKey}
                        className={cn('flex min-h-12 items-center gap-3 border-b border-border/60 px-1', disabled ? 'opacity-50' : 'cursor-pointer')}
                    >
                        <input
                            type="radio"
                            name="member-role"
                            value={option.roleKey}
                            checked={draft.choice === option.roleKey}
                            disabled={disabled}
                            onChange={handleChoiceChange}
                            className="h-4 w-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{optionLabel(option, locale)}</span>
                        {hostOnlyKeys?.has(option.roleKey) && <span className="shrink-0 text-xs font-semibold text-ink-faint">{t('hostOnly')}</span>}
                        {full && <span className="shrink-0 text-xs font-semibold text-ink-faint">{t('full')}</span>}
                    </label>
                );
            })}

            {/* Other */}
            {allowCustom && (
                <>
                    <label className={cn('flex min-h-12 items-center gap-3 px-1', otherDisabled ? 'opacity-50' : 'cursor-pointer')}>
                        <input
                            type="radio"
                            name="member-role"
                            value={OTHER_CHOICE}
                            checked={otherSelected}
                            disabled={otherDisabled}
                            onChange={handleChoiceChange}
                            className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm text-ink">{t('other')}</span>
                    </label>
                    {otherSelected && !otherDisabled && (
                        <input
                            value={draft.customText}
                            onChange={handleCustomTextChange}
                            maxLength={customMaxLength}
                            aria-label={t('other')}
                            placeholder={t('otherPlaceholder')}
                            className="mx-1 h-11 rounded-xl border border-border bg-background px-3 text-sm text-ink outline-none focus:border-primary"
                        />
                    )}
                    {customLocked && <p className="px-1 pt-1 text-xs text-ink-muted">{t('lockedNote')}</p>}
                </>
            )}
        </fieldset>
    );
}
