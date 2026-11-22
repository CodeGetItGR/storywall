'use client';

import { useTranslations } from 'next-intl';

import { FeedSectionCard } from '@/components/feed/edit/FeedSectionCard';
import { Modal } from '@/components/ui/modal';
import type { FeedSectionPreviews } from '@/hooks/useFeedSectionPreviews';
import type { NewSectionType } from '@/lib/invitation/newSection';

type FeedAddSectionSheetProps = { open: boolean; previews: FeedSectionPreviews; onAdd: (type: NewSectionType) => void; onClose: () => void };

// The feed's Add section picker: the blocks the host may add, as cards. One column on phones, two on desktop.
export function FeedAddSectionSheet({ open, previews, onAdd, onClose }: FeedAddSectionSheetProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <Modal open={open} onClose={onClose} variant="sheet" ariaLabel={t('sections.add')} closeLabel={t('close')}>
            <Modal.Body className="flex flex-col gap-4 px-5 pt-5 pb-8 text-sm text-ink">
                {/* Title */}
                <h2 className="pr-10 text-base font-semibold">{t('sections.add')}</h2>

                {/* Uploaded fonts: built only from validated names and urls, so safe to inline */}
                {previews.fontFaces && <style>{previews.fontFaces}</style>}

                {/* Sections */}
                {previews.items.length > 0 ? (
                    <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {previews.items.map((preview) => (
                            <li key={preview.type}>
                                <FeedSectionCard
                                    preview={preview}
                                    name={t(`sectionNames.${preview.type}`)}
                                    ctx={previews.ctx}
                                    lang={previews.lang}
                                    onAdd={onAdd}
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-ink-muted">{t('sections.nothingToAdd')}</p>
                )}
            </Modal.Body>
        </Modal>
    );
}
