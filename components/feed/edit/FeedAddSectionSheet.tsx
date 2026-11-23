'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { FeedAddSectionRow } from '@/components/feed/edit/FeedAddSectionRow';
import { FeedSectionPreviewDialog } from '@/components/feed/edit/FeedSectionPreviewDialog';
import { Modal } from '@/components/ui/modal';
import { useFeedSectionPreview } from '@/hooks/useFeedSectionPreview';
import type { FeedSectionPreviews } from '@/lib/feedSectionPreview';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { sectionNameKey } from '@/lib/invitation/sectionNames';

type FeedAddSectionSheetProps = {
    open: boolean;
    eventType: string;
    previews: FeedSectionPreviews | null;
    // The Premium tiles, or null when none show.
    tiles: ReactNode | null;
    onAdd: (type: NewSectionType) => void;
    onClose: () => void;
};

// The feed's Add section sheet (spec item 11): the intro, the event type's sections as a plain list, then Premium.
export function FeedAddSectionSheet({ open, eventType, previews, tiles, onAdd, onClose }: FeedAddSectionSheetProps) {
    const t = useTranslations('InvitationEditor');
    const tFeed = useTranslations('FeedEditor');
    const items = previews?.items ?? [];
    const preview = useFeedSectionPreview(items);
    const name = (type: NewSectionType) => t(sectionNameKey(type, eventType));

    return (
        <Modal open={open} onClose={onClose} variant="sheet" ariaLabel={t('sections.add')} closeLabel={t('close')}>
            <Modal.Body className="flex flex-col gap-4 px-5 pt-5 pb-8 text-sm text-ink">
                {/* Title */}
                <div className="flex flex-col gap-1 pr-10">
                    <h2 className="text-base font-semibold">{t('sections.add')}</h2>
                    <p className="text-ink-muted">{tFeed('addIntro')}</p>
                </div>

                {/* Uploaded fonts: built only from validated names and urls, so safe to inline */}
                {previews?.fontFaces && <style>{previews.fontFaces}</style>}

                {/* Sections */}
                {items.length > 0 && (
                    <ul className="flex flex-col">
                        {items.map((item) => (
                            <FeedAddSectionRow key={item.type} type={item.type} name={name(item.type)} onAdd={onAdd} onPreview={preview.open} />
                        ))}
                    </ul>
                )}

                {/* Premium */}
                {tiles && (
                    <section className="flex flex-col gap-3 pt-2">
                        <h3 className="text-[13px] font-semibold tracking-wide text-ink-muted uppercase">{tFeed('premium')}</h3>
                        {tiles}
                    </section>
                )}

                {/* Nothing left */}
                {items.length === 0 && !tiles && <p className="text-ink-muted">{t('sections.nothingToAdd')}</p>}
            </Modal.Body>

            {/* Preview popup */}
            {previews && (
                <FeedSectionPreviewDialog
                    preview={preview.current}
                    name={preview.current ? name(preview.current.type) : ''}
                    ctx={previews.ctx}
                    lang={previews.lang}
                    onClose={preview.close}
                />
            )}
        </Modal>
    );
}
