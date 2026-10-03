'use client';

import { useTranslations } from 'next-intl';

import { RolePickerList } from '@/components/memberRoles/RolePickerList';
import { LoadingState } from '@/components/ui/LoadingState';
import { useRoleErrorMessage } from '@/hooks/useRoleErrorMessage';
import type { RoleForm } from '@/hooks/useRoleForm';

export function RoleFormBody({ formId, form }: { formId: string; form: RoleForm }) {
    const t = useTranslations('MemberRoles');
    const roleErrorMessage = useRoleErrorMessage();
    const errorMessage = form.error ? roleErrorMessage(form.error, { maxLength: form.maxLength, option: form.chosenOption }) : null;

    return (
        <form id={formId} onSubmit={form.handleSubmit} noValidate>
            {/* Loading */}
            {form.isLoading && <LoadingState label={t('loading')} className="justify-start py-4" />}
            {form.loadFailed && <p className="py-4 text-sm text-destructive">{t('loadFailed')}</p>}

            {/* Roles */}
            {form.options && (
                <RolePickerList
                    options={form.options}
                    allowCustom={form.allowCustom}
                    customLocked={form.customLocked}
                    lockedRoleLabel={form.lockedRoleLabel}
                    hostOnlyKeys={form.hostOnlyKeys}
                    currentRoleKey={form.currentRoleKey}
                    draft={form.draft}
                    customMaxLength={form.maxLength}
                    onChoiceChangeAction={form.handleChoiceChange}
                    onCustomTextChangeAction={form.handleCustomTextChange}
                />
            )}

            {/* Error */}
            {errorMessage && (
                <p role="alert" className="pt-3 text-sm text-destructive">
                    {errorMessage}
                </p>
            )}
        </form>
    );
}
