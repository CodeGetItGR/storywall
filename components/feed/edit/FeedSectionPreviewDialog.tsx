'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Modal } from '@/components/ui/modal';

// picture: the section's live picture. Null: closed.
type FeedSectionPreviewDialogProps = { name: string; picture: ReactNode | null; onClose: () => void };

// The eye's popup (spec item 11): a small window centred on the screen, animated in, with the block's live preview.
export function FeedSectionPreviewDialog({ name, picture, onClose }: FeedSectionPreviewDialogProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <Modal open={picture !== null} onClose={onClose} size="sm" ariaLabel={name} closeLabel={t('close')}>
            <Modal.Body className="flex flex-col gap-3 p-4">
                {/* Name */}
                <h3 className="pr-10 text-[15px] font-semibold text-ink">{name}</h3>

                {/* Preview */}
                {picture !== null && (
                    // As tall as the section, up to 60% of the screen; a taller one scrolls.
                    <div className="max-h-[60vh] overflow-y-auto overscroll-contain rounded-xl bg-surface-muted">{picture}</div>
                )}
            </Modal.Body>
        </Modal>
    );
}
