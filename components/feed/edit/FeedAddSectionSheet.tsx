'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { FeedAddSectionRow } from '@/components/feed/edit/FeedAddSectionRow';
import { FeedSectionPreviewDialog } from '@/components/feed/edit/FeedSectionPreviewDialog';
import { Modal } from '@/components/ui/modal';
import { useFeedSectionPreview } from '@/hooks/useFeedSectionPreview';
import type { FeedAddKind } from '@/lib/feedEditing';
import type { SectionType } from '@/lib/invitation/sections';

// One section the sheet lists: its name, and the live picture its eye opens.
export type FeedAddItem<T extends SectionType> = { type: T; name: string; picture: ReactNode };

type FeedAddSectionSheetProps<T extends SectionType> = {
    kind: FeedAddKind;
    open: boolean;
    items: readonly FeedAddItem<T>[];
    // The Premium tiles, or null when none show. Never in Feed mode.
    tiles: ReactNode | null;
    onAdd: (type: T) => void;
    onClose: () => void;
};

// The feed's Add section sheet (spec item 11): the intro (not in Feed mode), the sections as a plain list, then
// Premium.
export function FeedAddSectionSheet<T extends SectionType>({ kind, open, items, tiles, onAdd, onClose }: FeedAddSectionSheetProps<T>) {
    const t = useTranslations('InvitationEditor');
    const tFeed = useTranslations('FeedEditor');
    const preview = useFeedSectionPreview(items);

    return (
        <Modal open={open} onClose={onClose} variant="sheet" ariaLabel={t('sections.add')} closeLabel={t('close')}>
            <Modal.Body className="flex flex-col gap-4 px-5 pt-5 pb-8 text-sm text-ink">
                {/* Title */}
                <div className="flex flex-col gap-1 pr-10">
                    <h2 className="text-base font-semibold">{t('sections.add')}</h2>
                    {kind === 'invitation' && <p className="text-ink-muted">{tFeed('addIntro')}</p>}
                </div>

                {/* Sections */}
                {items.length > 0 && (
                    <ul className="flex flex-col">
                        {items.map((item) => (
                            <FeedAddSectionRow key={item.type} type={item.type} name={item.name} onAdd={onAdd} onPreview={preview.open} />
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
            <FeedSectionPreviewDialog name={preview.current?.name ?? ''} picture={preview.current?.picture ?? null} onClose={preview.close} />
        </Modal>
    );
}
