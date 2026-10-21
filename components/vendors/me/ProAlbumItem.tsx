'use client';

import { Trash2, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { Button } from '@/components/ui/button';
import type { MediaResponseDto } from '@/lib/api/types';

// One of the vendor's own Pro items, with its delete button while their Pro tools are open.
export function ProAlbumItem({
    item,
    canDelete,
    onDeleteAction,
}: {
    item: MediaResponseDto;
    canDelete: boolean;
    onDeleteAction: (mediaId: string) => void;
}) {
    const t = useTranslations('Vendors');
    const previewUrl = item.thumbnailUrl ?? item.mediaUrl;
    const handleDelete = useCallback(() => onDeleteAction(item.id), [item.id, onDeleteAction]);

    return (
        <li className="relative aspect-square overflow-hidden rounded-xl bg-surface-muted">
            {previewUrl ? (
                <ProtectedImage src={previewUrl} alt={item.originalFilename} fill sizes="120px" className="object-cover" />
            ) : (
                <Video className="absolute inset-0 m-auto size-6 text-ink-muted" aria-hidden="true" />
            )}
            {canDelete && (
                <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    onClick={handleDelete}
                    aria-label={t('me.proDelete')}
                    className="absolute top-1 right-1"
                >
                    <Trash2 aria-hidden="true" />
                </Button>
            )}
        </li>
    );
}
