'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AddBlockedTermModal } from '@/components/admin/memberRoles/AddBlockedTermModal';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useBlockedTermsSection } from '@/hooks/useBlockedTermsSection';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/datetime';

export function BlockedTermsSection() {
    const t = useTranslations('AdminPage.blockedTerms');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const section = useBlockedTermsSection();

    function handleDeleteClick(event: MouseEvent<HTMLButtonElement>) {
        section.requestDelete(event.currentTarget.dataset.id ?? '');
    }

    return (
        <section className="space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
                    <p className="text-sm text-ink-muted">{t('caption')}</p>
                </div>
                <button
                    type="button"
                    onClick={section.openAdd}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                >
                    <Plus className="h-4 w-4" />
                    {t('add')}
                </button>
            </div>

            {/* Words */}
            <div className="rounded-xl border border-border bg-card">
                {section.isLoading && <LoadingState label={t('loading')} className="justify-start p-4" />}
                {section.loadError && <p className="p-4 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(section.loadError)}`)}</p>}
                {!section.isLoading && !section.loadError && section.terms.length === 0 && (
                    <p className="px-3 py-8 text-center text-sm text-ink-muted">{t('empty')}</p>
                )}
                {section.terms.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                    <th className="px-3 py-2">{t('term')}</th>
                                    <th className="px-3 py-2">{t('added')}</th>
                                    <th className="px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {section.terms.map((term) => (
                                    <tr key={term.id} className="border-b border-border last:border-b-0">
                                        <td className="px-3 py-2 font-mono text-sm text-ink">{term.term}</td>
                                        <td className="px-3 py-2 text-sm text-ink-muted">{formatDate(locale, term.createdAt, { dateStyle: 'medium' })}</td>
                                        <td className="px-3 py-2 text-right">
                                            <button
                                                type="button"
                                                data-id={term.id}
                                                onClick={handleDeleteClick}
                                                aria-label={t('delete', { term: term.term })}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-canvas hover:text-status-danger"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add */}
            <AddBlockedTermModal section={section} />

            {/* Delete confirmation */}
            <ConfirmActionModal
                open={Boolean(section.deleting)}
                title={t('deleteTitle', { term: section.deleting?.term ?? '' })}
                body={
                    <>
                        {t('deleteBody')}
                        {section.deleteError && <span className="mt-2 block text-status-danger">{getErrorMessage(section.deleteError)}</span>}
                    </>
                }
                cancelLabel={t('cancel')}
                confirmLabel={t('deleteConfirm')}
                isConfirming={section.isDeleting}
                onConfirmAction={section.confirmDelete}
                onCloseAction={section.cancelDelete}
            />
        </section>
    );
}
