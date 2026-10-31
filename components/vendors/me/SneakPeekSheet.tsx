'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { MediaThumbnail } from '@/components/common/MediaThumbnail';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { type SneakPeekSubmit, useSneakPeekSheet } from '@/hooks/useSneakPeekSheet';
import type { MediaResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Pick 1–20 of the vendor's own Pro items and an optional caption. Mount it keyed on the mode so each
// opening starts from the saved sneak peek.
export function SneakPeekSheet({
    open,
    mode,
    items,
    initialPicked,
    initialCaption,
    hasMore,
    isSaving,
    error,
    onLoadMoreAction,
    onSubmitAction,
    onCloseAction,
}: {
    open: boolean;
    mode: 'new' | 'edit';
    items: MediaResponseDto[];
    initialPicked: readonly string[];
    initialCaption: string | null;
    hasMore: boolean;
    isSaving: boolean;
    error: string | null;
    onLoadMoreAction: () => void;
    onSubmitAction: (body: SneakPeekSubmit) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.sneakPeek');
    const sheet = useSneakPeekSheet({ mode, initialPicked, initialCaption, onSubmit: onSubmitAction, onClose: onCloseAction });
    const captionId = useId();

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="md" ariaLabel={t('sheetTitle')} closeLabel={t('cancel')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                <form onSubmit={sheet.handleSubmit} className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-baseline justify-between gap-3 pr-8">
                        <h2 className="text-base font-bold text-ink">{t('sheetTitle')}</h2>
                        <p className="text-sm text-ink-muted tabular-nums">{t('picked', { count: sheet.picked.length })}</p>
                    </div>

                    {/* Items */}
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {items.map((item, i) => {
                            const order = sheet.pickIndex(item.id);
                            const isPicked = order >= 0;
                            return (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        data-media-id={item.id}
                                        onClick={sheet.handlePick}
                                        aria-pressed={isPicked}
                                        aria-label={t(isPicked ? 'unpick' : 'pick', { index: i + 1 })}
                                        className={cn(
                                            'relative block aspect-square w-full overflow-hidden rounded-lg',
                                            isPicked && 'ring-2 ring-primary ring-offset-2',
                                        )}
                                    >
                                        <MediaThumbnail
                                            src={item.mediaUrl}
                                            mediaType={item.mediaType}
                                            status={item.status}
                                            thumbnailUrl={item.thumbnailUrl}
                                            alt={t('pickAlt', { index: i + 1 })}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 640px) 33vw, 160px"
                                        />
                                        {isPicked && (
                                            <span className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground tabular-nums">
                                                {order + 1}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {hasMore && (
                        <Button type="button" variant="outline" size="lg" onClick={onLoadMoreAction}>
                            {t('more')}
                        </Button>
                    )}

                    {/* Caption */}
                    <label htmlFor={captionId} className="flex flex-col gap-1 text-sm text-ink">
                        {t('captionLabel')}
                        <textarea
                            id={captionId}
                            value={sheet.caption}
                            onChange={sheet.handleCaption}
                            maxLength={sheet.maxLength}
                            rows={3}
                            className="rounded-lg border border-border bg-background px-3 py-2"
                        />
                    </label>
                    {error && (
                        <p role="alert" className="text-sm text-rose-600">
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="lg" onClick={onCloseAction}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" size="lg" disabled={!sheet.canSubmit || isSaving}>
                            {t(mode === 'new' ? 'share' : 'save')}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
