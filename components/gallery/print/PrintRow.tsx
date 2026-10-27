'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { MediaThumbnail } from '@/components/common/MediaThumbnail';
import { Button } from '@/components/ui/button';
import type { PrintItemPatch, PrintListItemDto, PrintSizeDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { PRINT_COPIES_MAX } from '@/lib/printPicks';

// One pick: thumbnail, size, copies, remove. A photo deleted from the gallery shows as removed.
export function PrintRow({
    item,
    sizes,
    disabled,
    onUpdateAction,
    onRemoveAction,
}: {
    item: PrintListItemDto;
    sizes: PrintSizeDto[];
    disabled?: boolean;
    onUpdateAction: (itemId: string, patch: PrintItemPatch) => void;
    onRemoveAction: (itemId: string) => void;
}) {
    const t = useTranslations('GalleryPage.print');
    const locale = useLocale();
    const { media } = item;
    // A size the photographer no longer offers (or none) shows a placeholder, so every real size can be chosen.
    const sizeValue = sizes.some((size) => size.id === item.sizeId) ? (item.sizeId ?? '') : '';

    function handleSizeChange(event: ChangeEvent<HTMLSelectElement>) {
        onUpdateAction(item.id, { sizeId: event.currentTarget.value });
    }
    function handleFewer() {
        onUpdateAction(item.id, { copies: item.copies - 1 });
    }
    function handleMore() {
        onUpdateAction(item.id, { copies: item.copies + 1 });
    }
    function handleRemove() {
        onRemoveAction(item.id);
    }

    return (
        <li className="flex items-center gap-3 py-2">
            {/* Photo */}
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                {media && (
                    <MediaThumbnail
                        src={media.mediaUrl}
                        mediaType={media.mediaType}
                        status={media.status}
                        thumbnailUrl={media.thumbnailUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                    />
                )}
            </div>

            {/* Size and copies */}
            <div className="min-w-0 flex-1">
                {item.removed ? (
                    <p className="text-sm text-ink-muted">{t('removed')}</p>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        {sizes.length > 0 && (
                            <select
                                aria-label={t('size')}
                                value={sizeValue}
                                onChange={handleSizeChange}
                                disabled={disabled}
                                className="min-h-10 rounded-lg border border-border bg-background px-2 text-sm"
                            >
                                <option value="" disabled>
                                    {t('size')}
                                </option>
                                {sizes.map((size) => (
                                    <option key={size.id} value={size.id}>
                                        {t('sizeOption', { label: size.label, price: formatMoney(locale, size.priceCents, size.currency) })}
                                    </option>
                                ))}
                            </select>
                        )}
                        <div className="flex items-center gap-1" role="group" aria-label={t('copies')}>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                aria-label={t('fewer')}
                                disabled={disabled || item.copies <= 1}
                                onClick={handleFewer}
                            >
                                <Minus aria-hidden="true" />
                            </Button>
                            <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.copies}</span>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                aria-label={t('more')}
                                disabled={disabled || item.copies >= PRINT_COPIES_MAX}
                                onClick={handleMore}
                            >
                                <Plus aria-hidden="true" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Remove */}
            <Button type="button" size="icon" variant="ghost" aria-label={t('remove')} disabled={disabled} onClick={handleRemove}>
                <Trash2 aria-hidden="true" />
            </Button>
        </li>
    );
}
