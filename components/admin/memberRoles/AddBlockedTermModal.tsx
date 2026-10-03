'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { Modal } from '@/components/ui/modal';
import type { BlockedTermsSectionState } from '@/hooks/useBlockedTermsSection';
import { getErrorMessage } from '@/lib/api/errors';
import { BLOCKED_TERM_MAX } from '@/lib/blockedTerms';

export function AddBlockedTermModal({ section }: { section: BlockedTermsSectionState }) {
    const t = useTranslations('AdminPage.blockedTerms');
    const hint = section.invalid ? t('termInvalid') : section.addFailure === 'taken' ? t('termTaken') : undefined;

    return (
        <Modal open={section.adding} onClose={section.closeAdd} size="sm" closeLabel={t('close')} ariaLabel={t('add')}>
            <form onSubmit={section.handleAddSubmit} className="space-y-4 p-5" noValidate>
                {/* Header */}
                <h3 className="text-lg font-semibold text-ink">{t('add')}</h3>

                {/* Word */}
                <AdminField label={t('term')} required hint={hint}>
                    <input
                        value={section.draft}
                        onChange={section.handleDraftChange}
                        maxLength={BLOCKED_TERM_MAX}
                        autoComplete="off"
                        className={adminInputClass('w-full font-mono')}
                    />
                </AdminField>
                {section.addFailure === 'other' && <p className="text-sm text-status-danger">{getErrorMessage(section.addError)}</p>}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={section.closeAdd}
                        className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={section.isAdding}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                        {section.isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t('save')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
