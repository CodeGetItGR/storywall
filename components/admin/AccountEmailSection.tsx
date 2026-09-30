'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useAccountEmailChange } from '@/hooks/useAccountEmailChange';
import type { UserResponseDto } from '@/lib/api/types';

export function AccountEmailSection({ account, onChangedAction }: { account: UserResponseDto; onChangedAction: (account: UserResponseDto) => void }) {
    const t = useTranslations('AdminPage.accounts.email');
    const emailChange = useAccountEmailChange({ account, onChangedAction });

    return (
        <section aria-labelledby="account-email-heading" className="border-t border-border pt-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h3 id="account-email-heading" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                    {t('title')}
                </h3>
                {!emailChange.open ? (
                    <button
                        type="button"
                        onClick={emailChange.start}
                        className="inline-flex min-h-9 items-center rounded-md px-3 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                    >
                        {t('change')}
                    </button>
                ) : null}
            </div>

            {/* Form */}
            {emailChange.open ? (
                <form className="mt-3 space-y-3" onSubmit={emailChange.submit} noValidate>
                    <AdminField label={t('label')} hint={t('unverifyHint')}>
                        <input
                            type="email"
                            autoComplete="off"
                            value={emailChange.email}
                            onChange={emailChange.handleChange}
                            disabled={emailChange.isSaving}
                            aria-invalid={Boolean(emailChange.error)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    {emailChange.error ? (
                        <p role="alert" className="text-xs font-semibold text-status-danger">
                            {emailChange.error}
                        </p>
                    ) : null}
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={emailChange.cancel}
                            disabled={emailChange.isSaving}
                            className="min-h-10 rounded-md px-4 text-sm font-semibold text-ink-muted hover:bg-canvas disabled:opacity-50"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!emailChange.canSave}
                            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
                        >
                            {emailChange.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {t('save')}
                        </button>
                    </div>
                </form>
            ) : null}
        </section>
    );
}
