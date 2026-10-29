'use client';

import { QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useId } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useRadioGroupKeys } from '@/hooks/useRadioGroupKeys';
import type { QrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_ID } from '@/lib/qrCard';
import { cn } from '@/lib/utils';

function optionClass(selected: boolean) {
    return cn(
        'flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-xl p-1.5 text-xs font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        selected ? 'bg-surface-muted text-ink ring-2 ring-primary' : 'text-ink-muted hover:bg-surface-muted/60 hover:text-ink',
    );
}

// Plain first, then the event's designs. A design's name reaches assistive tech through its
// artwork's alt text; the visible caption repeats it for sighted users only.
export function QrCardTemplateStrip({
    templates,
    selectedId,
    failed,
    onSelectAction,
    onRetryAction,
}: {
    templates: QrCardTemplateDto[];
    selectedId: string;
    failed: boolean;
    onSelectAction: (templateId: string) => void;
    onRetryAction: () => void;
}) {
    const t = useTranslations('QrCardPage');
    const tAlt = useTranslations('ImageAlt');
    const localizedText = useLocalizedText();
    const headingId = useId();
    const ids = [PLAIN_QR_CARD_ID, ...templates.map((template) => template.id)];
    // The one tile Tab lands on: the pick, or Plain while the pick is not in the strip.
    const tabStopId = ids.includes(selectedId) ? selectedId : PLAIN_QR_CARD_ID;
    const handleKeyDown = useRadioGroupKeys(ids, tabStopId, onSelectAction);

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onSelectAction(event.currentTarget.dataset.radioId ?? PLAIN_QR_CARD_ID);
    }

    return (
        <section aria-labelledby={headingId}>
            <h2 id={headingId} className="text-sm font-semibold text-ink">
                {t('templates')}
            </h2>
            <div
                role="radiogroup"
                aria-labelledby={headingId}
                onKeyDown={handleKeyDown}
                className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pt-1 pb-2"
            >
                {/* Plain */}
                <button
                    type="button"
                    role="radio"
                    aria-checked={selectedId === PLAIN_QR_CARD_ID}
                    data-radio-id={PLAIN_QR_CARD_ID}
                    tabIndex={tabStopId === PLAIN_QR_CARD_ID ? 0 : -1}
                    onClick={handleClick}
                    className={optionClass(selectedId === PLAIN_QR_CARD_ID)}
                >
                    <span className="flex aspect-105/148 w-full items-center justify-center rounded-lg bg-white shadow-sm">
                        <QrCode className="h-6 w-6 text-ink" aria-hidden="true" />
                    </span>
                    {t('plain')}
                </button>
                {/* Designs */}
                {templates.map((template) => {
                    const name = localizedText(template.name);
                    return (
                        <button
                            key={template.id}
                            type="button"
                            role="radio"
                            aria-checked={selectedId === template.id}
                            data-radio-id={template.id}
                            tabIndex={tabStopId === template.id ? 0 : -1}
                            onClick={handleClick}
                            className={optionClass(selectedId === template.id)}
                        >
                            <span className="relative aspect-105/148 w-full overflow-hidden rounded-lg shadow-sm">
                                <ProtectedImage
                                    src={template.artworkUrl}
                                    alt={tAlt('qrCardTemplate', { name })}
                                    fill
                                    sizes="80px"
                                    className="object-cover"
                                />
                            </span>
                            <span aria-hidden="true" className="w-full truncate text-center">
                                {name}
                            </span>
                        </button>
                    );
                })}
            </div>
            {/* Failed */}
            {failed && (
                <p role="status" className="mt-1 text-sm text-ink-muted">
                    {t('templatesFailed')}{' '}
                    <button type="button" onClick={onRetryAction} className="font-semibold text-primary underline-offset-2 hover:underline">
                        {t('retry')}
                    </button>
                </p>
            )}
        </section>
    );
}
