'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GiftDetailsFields } from '@/components/giftMode/GiftDetailsFields';
import { Modal } from '@/components/ui/modal';
import type { GiftManagement } from '@/hooks/useGiftManagement';

// Sets up the gift, or edits its details. The card and PIN stay the same.
export function GiftDetailsModal({ management, isNew }: { management: GiftManagement; isNew: boolean }) {
    const t = useTranslations('GiftMode.manage');

    return (
        <Modal open={management.detailsOpen} onClose={management.closeDetails} size="sm" closeLabel={t('cancel')}>
            <Modal.Body className="px-4 pt-12 pb-4 sm:px-5">
                <form className="flex flex-col gap-5" onSubmit={management.submitDetails}>
                    {/* Header */}
                    <h2 className="pr-8 text-base font-semibold text-ink">{isNew ? t('setUp') : t('editTitle')}</h2>

                    {/* Fields */}
                    <GiftDetailsFields
                        value={management.details.value}
                        onChangeAction={management.details.handleChange}
                        disabled={management.isSaving}
                    />
                    {management.detailsError && <p className="text-sm text-rose-600">{management.detailsError}</p>}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={management.closeDetails}
                            disabled={management.isSaving}
                            className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={management.isSaving || !management.details.request}
                            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {management.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t('save')}
                        </button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
