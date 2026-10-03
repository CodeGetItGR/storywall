'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { RoleForm } from '@/hooks/useRoleForm';

export function RoleSheetFooter({ formId, form }: { formId: string; form: RoleForm }) {
    const t = useTranslations('MemberRoles');

    return (
        <>
            {/* Clear */}
            <div>
                {form.hasRole && (
                    <button
                        type="button"
                        onClick={form.requestClear}
                        disabled={form.isClearing}
                        className="min-h-11 rounded-full px-3 text-sm font-semibold text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
                    >
                        {t('clear')}
                    </button>
                )}
            </div>

            {/* Save */}
            <button
                type="submit"
                form={formId}
                disabled={!form.canSave}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-50"
            >
                {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {t('save')}
            </button>
        </>
    );
}
