'use client';

import { EyeOff, Gift, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GiftAccountForm } from '@/components/gifts/GiftAccountForm';
import { SetupChecklist, type SetupChecklistItem } from '@/components/manage/SetupChecklist';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { Modal } from '@/components/ui/modal';
import { useGiftAccount } from '@/hooks/useGiftAccount';
import { useGiftAccountEditor } from '@/hooks/useGiftAccountEditor';

export function GiftAccountSetup({ eventId, className = 'mt-3 border-t border-border/70 pt-3' }: { eventId: string; className?: string }) {
    const t = useTranslations('ManagePage.giftAccount');
    const tGifts = useTranslations('GiftsPage');
    const account = useGiftAccount(eventId);
    const editor = useGiftAccountEditor(eventId);
    const isConfigured = Boolean(account.data);
    const shouldShowChecklist = account.isLoading || !isConfigured;

    const checklistItems: SetupChecklistItem[] = [
        {
            id: 'gift-account',
            title: isConfigured ? t('checklist.readyTitle') : t('checklist.missingTitle'),
            body: isConfigured ? t('checklist.readyBody') : t('checklist.missingBody'),
            hint: isConfigured ? undefined : t('checklist.hiddenUntilReady'),
            icon: isConfigured ? Gift : EyeOff,
            status: isConfigured ? 'complete' : 'missing',
            action: {
                label: isConfigured ? t('edit') : t('add'),
                onClick: editor.startEditing,
                disabled: account.isLoading,
                icon: Pencil,
            },
        },
    ];

    return (
        <>
            {shouldShowChecklist && <SetupChecklist className={className} items={checklistItems} />}

            <Modal open={editor.isEditing} onClose={editor.stopEditing} size="md" closeLabel={tGifts('cancel')}>
                <Modal.Body className="px-4 pt-12 pb-5 sm:px-5">
                    {/* Header */}
                    <div className="pr-8">
                        <h2 className="text-lg font-semibold text-ink">{t('editorTitle')}</h2>
                        <p className="mt-1 text-sm leading-6 text-ink-muted">{t('editorBody')}</p>
                    </div>

                    {/* Form */}
                    <GiftAccountForm
                        account={account.data}
                        onSubmitAction={editor.submit}
                        isSaving={editor.isSaving}
                        invalidIban={editor.invalidIban}
                        onRemoveAction={account.data ? editor.openRemove : undefined}
                        className="mt-4"
                    />
                </Modal.Body>
            </Modal>
            <ConfirmActionModal
                open={editor.removeOpen}
                onCloseAction={editor.closeRemove}
                onConfirmAction={editor.confirmRemove}
                title={tGifts('removeTitle')}
                body={tGifts('removeBody')}
                confirmLabel={tGifts('remove')}
                cancelLabel={tGifts('cancel')}
                isConfirming={editor.isRemoving}
            />
        </>
    );
}
