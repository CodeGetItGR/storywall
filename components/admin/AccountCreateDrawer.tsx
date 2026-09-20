'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useCreateProvisionedAccount } from '@/hooks/useCreateProvisionedAccount';
import type { UserResponseDto } from '@/lib/api/types';

export function AccountCreateDrawer({
    onCloseAction,
    onProvisionAction,
}: {
    onCloseAction: () => void;
    onProvisionAction: (account: UserResponseDto) => void;
}) {
    const t = useTranslations('AdminPage.accounts.create');
    const form = useCreateProvisionedAccount();

    function handleContinue() {
        if (form.createdAccount) onProvisionAction(form.createdAccount);
    }

    function handleFirstNameChange(event: ChangeEvent<HTMLInputElement>) {
        form.setFirstName(event.target.value);
    }

    function handleLastNameChange(event: ChangeEvent<HTMLInputElement>) {
        form.setLastName(event.target.value);
    }

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        form.setEmail(event.target.value);
    }

    function handleUseExisting() {
        if (form.existingAccount) onProvisionAction(form.existingAccount);
    }

    const footer = form.createdAccount ? (
        <div className="flex w-full items-center justify-end gap-2">
            <button type="button" onClick={onCloseAction} className="min-h-10 rounded-md px-4 text-sm font-semibold text-ink-muted hover:bg-canvas">
                {t('done')}
            </button>
            <button
                type="button"
                onClick={handleContinue}
                className="min-h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
            >
                {t('continue')}
            </button>
        </div>
    ) : (
        <div className="flex w-full items-center justify-end gap-2">
            <button type="button" onClick={onCloseAction} className="min-h-10 rounded-md px-4 text-sm font-semibold text-ink-muted hover:bg-canvas">
                {t('cancel')}
            </button>
            <button
                type="submit"
                form="create-provisioned-account"
                disabled={form.isPending}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:cursor-wait disabled:opacity-60"
            >
                {form.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {form.isPending ? t('creating') : t('submit')}
            </button>
        </div>
    );

    return (
        <AdminDrawer open onClose={onCloseAction} closeLabel={t('close')} title={t('title')} subtitle={t('subtitle')} footer={footer}>
            {form.createdAccount ? (
                <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                    {/* Success */}
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-status-good-wash text-status-good">
                        <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-bold text-ink">{t('successTitle')}</h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">
                        {t('successBody', { email: form.createdAccount.email ?? form.email })}
                    </p>
                </section>
            ) : (
                <form id="create-provisioned-account" onSubmit={form.submit} className="space-y-6">
                    {/* Identity */}
                    <section className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <AdminField label={t('firstName')} required>
                                <input
                                    required
                                    autoComplete="given-name"
                                    value={form.firstName}
                                    onChange={handleFirstNameChange}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                            <AdminField label={t('lastName')} required>
                                <input
                                    required
                                    autoComplete="family-name"
                                    value={form.lastName}
                                    onChange={handleLastNameChange}
                                    className={adminInputClass()}
                                />
                            </AdminField>
                        </div>
                        <AdminField label={t('email')} required>
                            <input
                                required
                                type="email"
                                autoComplete="email"
                                value={form.email}
                                onChange={handleEmailChange}
                                className={adminInputClass()}
                            />
                        </AdminField>
                    </section>

                    {/* Password setup */}
                    <p className="rounded-lg bg-canvas px-4 py-3 text-sm leading-6 text-ink-muted">{t('emailHint')}</p>

                    {/* Error */}
                    {form.error ? (
                        <div role="alert" className="rounded-lg bg-status-danger-wash px-4 py-3 text-sm text-status-danger">
                            <p>{form.error}</p>
                            {form.isExistingAccountLoading ? <p className="mt-2 text-xs">{t('finding')}</p> : null}
                            {form.existingAccount ? (
                                <button type="button" onClick={handleUseExisting} className="mt-3 font-bold underline underline-offset-4">
                                    {t('useExisting')}
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </form>
            )}
        </AdminDrawer>
    );
}
