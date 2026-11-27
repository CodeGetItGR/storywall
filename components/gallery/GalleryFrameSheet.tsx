'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useId } from 'react';

import { UploadFramePreview } from '@/components/gallery/UploadFramePreview';
import { Modal } from '@/components/ui/modal';
import type { GalleryFrameSetting } from '@/hooks/useGalleryFrameSetting';
import type { UploadFrame } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// The host picks the frame: each design on the sample photo, and No frame. A pick saves at once.
export function GalleryFrameSheet({ setting }: { setting: GalleryFrameSetting }) {
    const tGallery = useTranslations('GalleryPage');
    const titleId = useId();
    const { choose } = setting;
    const handleChoose = useCallback((event: MouseEvent<HTMLButtonElement>) => choose(event.currentTarget.dataset.frame as UploadFrame), [choose]);

    return (
        <Modal
            open={setting.open}
            onClose={setting.close}
            variant="sheet"
            size="sm"
            labelledBy={titleId}
            closeLabel={tGallery('print.close')}
            closeDisabled={setting.saving}
        >
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 id={titleId} className="pr-8 text-base font-bold text-ink">
                    {setting.label}
                </h2>

                {/* Designs */}
                <div role="radiogroup" aria-labelledby={titleId} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {setting.options.map((option) => {
                        const labelId = `${titleId}-${option.frame}`;
                        const selected = option.frame === setting.current;
                        return (
                            <button
                                key={option.frame}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-labelledby={labelId}
                                disabled={setting.saving}
                                data-frame={option.frame}
                                onClick={handleChoose}
                                className={cn(
                                    'flex flex-col gap-2 rounded-xl p-2 text-left focus-ring disabled:opacity-60',
                                    selected ? 'bg-primary/10 ring-2 ring-primary' : 'bg-surface-muted/60',
                                )}
                            >
                                <UploadFramePreview src={option.previewSrc} alt={option.label} className="aspect-[4/5] w-full rounded-lg" />
                                <span id={labelId} className="text-sm font-semibold text-ink">
                                    {option.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Error */}
                {setting.error && (
                    <p role="alert" className="mt-3 text-xs text-red-500">
                        {setting.error}
                    </p>
                )}
            </Modal.Body>
        </Modal>
    );
}
