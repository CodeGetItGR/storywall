'use client';

import { Copy, KeyRound, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useCollaboratorPortalLink } from '@/hooks/useCollaboratorPortalLink';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function CollaboratorPortalLink({ collaborator }: { collaborator: CollaboratorResponseDto }) {
    const t = useTranslations('AdminPage.collaborations.portal');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const portal = useCollaboratorPortalLink(collaborator);

    const errorText = portal.error ? tAdmin(`errors.${adminErrorMessageKey(portal.error)}`) : null;

    return (
        <section className="space-y-3">
            {/* Link status */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
                    <p className="mt-0.5 text-sm text-ink-muted">
                        {!collaborator.portalTokenIssued
                            ? t('notIssued')
                            : collaborator.portalTokenIssuedAt
                              ? t('issuedAt', { date: formatDate(locale, collaborator.portalTokenIssuedAt, { dateStyle: 'medium' }) })
                              : t('issued')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={portal.requestIssue}
                    disabled={portal.isIssuing}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
                >
                    {portal.isIssuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {collaborator.portalTokenIssued ? t('replace') : t('create')}
                </button>
            </div>

            {/* One-time link */}
            {portal.issuedUrl && (
                <div className="rounded-lg bg-status-warn-wash p-3 text-sm text-status-warn">
                    <p className="font-semibold">{t('once')}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-md bg-card px-2.5 py-2 font-mono text-xs text-ink">{portal.issuedUrl}</code>
                        <button
                            type="button"
                            onClick={portal.copy}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-card px-3 text-sm font-semibold text-ink"
                        >
                            <Copy className="h-4 w-4" />
                            {portal.copied ? t('copied') : t('copy')}
                        </button>
                    </div>
                </div>
            )}
            {errorText && !portal.confirmOpen && <p className="text-sm text-status-danger">{errorText}</p>}

            <ConfirmActionModal
                open={portal.confirmOpen}
                onCloseAction={portal.closeConfirm}
                title={t('confirmTitle')}
                body={
                    <div className="space-y-2">
                        <p>{t('confirmBody')}</p>
                        {errorText && <p className="text-status-danger">{errorText}</p>}
                    </div>
                }
                cancelLabel={tAdmin('cancel')}
                confirmLabel={t('replace')}
                isConfirming={portal.isIssuing}
                onConfirmAction={portal.issue}
            />
        </section>
    );
}
