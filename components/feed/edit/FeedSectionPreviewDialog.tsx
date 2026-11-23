'use client';

import { useTranslations } from 'next-intl';

import { FeedSectionPreviewPicture } from '@/components/feed/edit/FeedSectionPreviewPicture';
import { Modal } from '@/components/ui/modal';
import type { FeedSectionPreview } from '@/lib/feedSectionPreview';
import type { RenderContext } from '@/lib/invitation/render';

type FeedSectionPreviewDialogProps = { preview: FeedSectionPreview | null; name: string; ctx: RenderContext; lang: string; onClose: () => void };

// The eye's popup (spec item 11): a small window centred on the screen, animated in, with the block's live preview.
export function FeedSectionPreviewDialog({ preview, name, ctx, lang, onClose }: FeedSectionPreviewDialogProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <Modal open={preview !== null} onClose={onClose} size="sm" ariaLabel={name} closeLabel={t('close')}>
            <Modal.Body className="flex flex-col gap-3 p-4">
                {/* Name */}
                <h3 className="pr-10 text-[15px] font-semibold text-ink">{name}</h3>

                {/* Preview */}
                {preview && (
                    // As tall as the section, up to 60% of the screen; a taller one scrolls.
                    <div className="max-h-[60vh] overflow-y-auto overscroll-contain rounded-xl bg-surface-muted">
                        <FeedSectionPreviewPicture preview={preview} ctx={ctx} lang={lang} />
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
}
