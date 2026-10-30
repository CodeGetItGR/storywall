'use client';

import { useTranslations } from 'next-intl';
import type { FocusEvent } from 'react';

import { QrCardLayoutGuides } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutGuides';
import { QrCardLayoutHandles } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutHandles';
import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import type { QrCardLayoutPointer } from '@/hooks/useQrCardLayoutPointer';
import { QR_CARD_SAMPLE_URL } from '@/lib/adminQrCards';
import { QR_CARD_HEIGHT, QR_CARD_WIDTH, type QrCardLine, type QrCardStyle } from '@/lib/qrCard';
import { elementRect, QR_CARD_ELEMENTS, QR_CARD_SAFE_AREA, type QrCardElement } from '@/lib/qrCardLayout';
import { cn } from '@/lib/utils';

const SAFE = QR_CARD_SAFE_AREA;

// The real card, with a transparent overlay of the same size on top for selecting, dragging and
// resizing. The card's height follows the screen's, so the whole card always shows.
export function QrCardLayoutCanvas({
    style,
    title,
    lines,
    selected,
    pointer,
    onElementFocusAction,
}: {
    style: QrCardStyle;
    title: string;
    lines: QrCardLine[];
    selected: QrCardElement | null;
    pointer: QrCardLayoutPointer;
    onElementFocusAction: (event: FocusEvent<SVGElement>) => void;
}) {
    const t = useTranslations('AdminPage.qrCards.layout');
    const { overlayRef, guides, handlePointerDown, handlePointerMove, handlePointerEnd } = pointer;

    return (
        <div className="flex items-start justify-center rounded-lg bg-canvas p-4 md:p-6">
            <div className="relative aspect-[105/148] w-full max-w-[min(100%,calc((100dvh-15rem)*105/148))] overflow-hidden rounded-md bg-white shadow-sm">
                {/* Card */}
                <QrCardSvg
                    style={style}
                    url={QR_CARD_SAMPLE_URL}
                    title={title}
                    lines={lines}
                    label={t('cardLabel', { title })}
                    className="block h-full w-full"
                />

                {/* Overlay */}
                <svg
                    ref={overlayRef}
                    viewBox={`0 0 ${QR_CARD_WIDTH} ${QR_CARD_HEIGHT}`}
                    role="group"
                    aria-label={t('canvas')}
                    className="absolute inset-0 h-full w-full touch-none select-none"
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                >
                    {/* Safe area */}
                    <rect
                        x={SAFE.left}
                        y={SAFE.top}
                        width={SAFE.right - SAFE.left}
                        height={SAFE.bottom - SAFE.top}
                        fill="none"
                        stroke="#94A3B8"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                        pointerEvents="none"
                    />
                    {/* Guides */}
                    <QrCardLayoutGuides guides={guides} />
                    {/* Elements */}
                    {QR_CARD_ELEMENTS.map((element) => {
                        const rect = elementRect(style.layout, element);
                        return (
                            <rect
                                key={element}
                                data-element={element}
                                role="button"
                                tabIndex={0}
                                aria-label={t(`elements.${element}`)}
                                aria-pressed={selected === element}
                                x={rect.x}
                                y={rect.y}
                                width={rect.width}
                                height={rect.height}
                                fill="transparent"
                                stroke={selected === element ? 'var(--color-primary)' : '#64748B'}
                                strokeWidth={selected === element ? 2 : 1}
                                strokeDasharray={selected === element ? undefined : '3 3'}
                                vectorEffect="non-scaling-stroke"
                                className={cn('cursor-move outline-none', 'focus-visible:[stroke-width:3]')}
                                onPointerDown={handlePointerDown}
                                onFocus={onElementFocusAction}
                            />
                        );
                    })}
                    {/* Handles */}
                    {selected && (
                        <QrCardLayoutHandles element={selected} rect={elementRect(style.layout, selected)} onPointerDownAction={handlePointerDown} />
                    )}
                </svg>
            </div>
        </div>
    );
}
