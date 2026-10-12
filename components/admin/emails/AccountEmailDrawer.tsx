'use client';

import { Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AccountEmailFields } from '@/components/admin/emails/AccountEmailFields';
import { AccountEmailSent } from '@/components/admin/emails/AccountEmailSent';
import { AccountEmailTemplatePicker } from '@/components/admin/emails/AccountEmailTemplatePicker';
import { EmailPreviewFrame } from '@/components/admin/emails/EmailPreviewFrame';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAccountEmailForm } from '@/hooks/useAccountEmailForm';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { hasTokenLink } from '@/lib/adminEmails';
import type { UserResponseDto } from '@/lib/api/types';

export function AccountEmailDrawer({ account, onCloseAction }: { account: UserResponseDto; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage.accounts.emails');
    const toErrorMessage = useApiErrorMessage();
    const form = useAccountEmailForm(account);
    const email = account.email ?? '';
    const templateLabel = form.template ? t(`templates.${form.template}`) : '';

    const footer = form.sent ? (
        <div className="flex w-full justify-end">
            {/* Footer */}
            <button type="button" onClick={onCloseAction} className="min-h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90">
                {t('done')}
            </button>
        </div>
    ) : (
        <div className="flex w-full items-center justify-end gap-2">
            {/* Footer */}
            <button type="button" onClick={onCloseAction} className="min-h-10 rounded-md px-4 text-sm font-semibold text-ink-muted hover:bg-canvas">
                {t('cancel')}
            </button>
            <button
                type="button"
                onClick={form.requestSend}
                disabled={!form.canSend}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
            >
                {form.isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('send')}
            </button>
        </div>
    );

    return (
        <AdminDrawer
            open
            size="wide"
            onClose={onCloseAction}
            closeLabel={t('close')}
            title={t('title')}
            subtitle={<span className="font-mono">{email}</span>}
            footer={footer}
            closeDisabled={form.isSending}
        >
            {/* Sent */}
            {form.sent ? <AccountEmailSent email={email} /> : null}

            {/* Loading */}
            {!form.sent && form.templatesQuery.isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
            {!form.sent && form.templatesQuery.error ? (
                <p role="alert" className="text-sm text-status-danger">
                    {toErrorMessage(form.templatesQuery.error)}
                </p>
            ) : null}

            {!form.sent && form.templatesQuery.data ? (
                <>
                    {/* Template */}
                    <AccountEmailTemplatePicker templates={form.templates} value={form.template} onChangeAction={form.changeTemplate} />

                    {/* Details */}
                    {form.template ? <AccountEmailFields form={form} /> : null}

                    {/* Preview */}
                    {form.template ? (
                        <EmailPreviewFrame
                            preview={form.preview}
                            isLoading={form.isPreviewLoading}
                            error={form.previewError}
                            note={hasTokenLink(form.template) ? t('tokenNote') : null}
                        />
                    ) : null}

                    {/* Send error */}
                    {form.sendError ? (
                        <p role="alert" className="rounded-lg bg-status-danger-wash px-4 py-3 text-sm text-status-danger">
                            {form.sendError}
                        </p>
                    ) : null}
                </>
            ) : null}

            {/* Send confirmation */}
            <ConfirmActionModal
                open={form.confirmOpen}
                onCloseAction={form.closeConfirm}
                title={t('confirmTitle')}
                body={t('confirmBody', { template: templateLabel, email })}
                confirmLabel={t('send')}
                cancelLabel={t('cancel')}
                tone="default"
                isConfirming={form.isSending}
                onConfirmAction={form.confirmSend}
            />
        </AdminDrawer>
    );
}
