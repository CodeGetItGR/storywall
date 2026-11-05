'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useInviartCollectionForm } from '@/hooks/useInviartCollectionForm';
import type { InviartCollectionRow } from '@/hooks/useInviartCollectionsPanel';

const FORM_ID = 'inviart-collection-form';
const HINT_ID = 'inviart-collection-hint';

// One occasion's INVIART collection handle. The panel mounts it per opening.
export function InviartCollectionDrawer({ row, title, onCloseAction }: { row: InviartCollectionRow; title: string; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage.inviart');
    const tAdmin = useTranslations('AdminPage');
    const toErrorMessage = useApiErrorMessage();
    const form = useInviartCollectionForm(row, onCloseAction);

    return (
        <AdminDrawer
            open
            onClose={onCloseAction}
            closeLabel={tAdmin('cancel')}
            closeDisabled={form.saving}
            title={title}
            footer={
                <>
                    <div />
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onCloseAction}
                            disabled={form.saving}
                            className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                        >
                            {tAdmin('cancel')}
                        </button>
                        <button
                            type="submit"
                            form={FORM_ID}
                            disabled={!form.canSave}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {form.saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {tAdmin('save')}
                        </button>
                    </div>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={form.handleSubmit} className="space-y-4">
                {/* Collection */}
                <AdminField label={t('collection')} hint={form.valid ? t('hint') : t('invalid')} hintId={HINT_ID}>
                    <input
                        name="collectionHandle"
                        value={form.handle}
                        onChange={form.handleChange}
                        aria-invalid={!form.valid}
                        aria-describedby={HINT_ID}
                        autoComplete="off"
                        spellCheck={false}
                        className={adminInputClass('font-mono')}
                    />
                </AdminField>
                {form.error ? <p className="text-sm text-status-danger">{toErrorMessage(form.error)}</p> : null}
            </form>
        </AdminDrawer>
    );
}
