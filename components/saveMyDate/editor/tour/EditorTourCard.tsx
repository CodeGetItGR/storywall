'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, type ReactNode, type Ref, useEffect, useId, useRef } from 'react';

import type { TourCardPlacement } from '@/lib/invitation/editorTour';
import { cn } from '@/lib/utils';

type EditorTourCardProps = {
    cardRef?: Ref<HTMLDivElement>;
    placement: TourCardPlacement;
    // Changes with the step, so the main button takes focus again.
    stepKey: string;
    position: number;
    total: number;
    title: string;
    body: string;
    isFirst: boolean;
    isLast: boolean;
    onBack: () => void;
    onNext: () => void;
    onSkip: () => void;
    children?: ReactNode;
};

const PLACEMENT_CLASS: Record<TourCardPlacement['kind'], string> = {
    center: 'left-1/2 top-1/2 w-[min(400px,calc(100vw-30px))] -translate-x-1/2 -translate-y-1/2',
    bottom: 'inset-x-3 bottom-3',
    beside: 'w-[min(350px,calc(100vw-28px))]',
};

// One step of the editor tour: where it is in the tour, what to do, and the buttons to move on.
export function EditorTourCard({
    cardRef,
    placement,
    stepKey,
    position,
    total,
    title,
    body,
    isFirst,
    isLast,
    onBack,
    onNext,
    onSkip,
    children,
}: EditorTourCardProps) {
    const t = useTranslations('InvitationEditor');
    const titleId = useId();
    const bodyId = useId();
    const nextRef = useRef<HTMLButtonElement>(null);
    const style: CSSProperties | undefined = placement.kind === 'beside' ? { left: placement.left, top: placement.top } : undefined;

    useEffect(() => {
        nextRef.current?.focus({ preventScroll: true });
    }, [stepKey]);

    return (
        <div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            style={style}
            className={cn(
                'pointer-events-auto fixed max-h-[calc(100svh-24px)] overflow-y-auto rounded-[18px] bg-white p-[18px] text-[#24262a] shadow-[0_22px_70px_rgba(0,0,0,0.34)]',
                PLACEMENT_CLASS[placement.kind],
            )}
        >
            {/* Step */}
            <p className="mb-2 text-[11px] text-[#8a8f98]">
                {position} / {total}
            </p>
            <h2 id={titleId} className="mb-2 text-[17px] leading-tight font-bold">
                {title}
            </h2>
            <p id={bodyId} className="text-[13px] leading-relaxed text-[#555b64]">
                {body}
            </p>
            {children}

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
                <button type="button" onClick={onSkip} className="rounded-[9px] py-2 pr-2 text-xs text-[#777b82] hover:text-[#2f3136]">
                    {t('tour.skip')}
                </button>
                {!isFirst && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="ml-auto rounded-[9px] bg-[#eceef1] px-3 py-2 text-xs text-[#3d4249] hover:bg-[#e2e5e9]"
                    >
                        {t('back')}
                    </button>
                )}
                <button
                    ref={nextRef}
                    type="button"
                    onClick={onNext}
                    className={cn(
                        'rounded-[9px] bg-[#2f3136] px-3 py-2 text-xs font-semibold text-white hover:bg-black focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                        isFirst && 'ml-auto',
                    )}
                >
                    {isLast ? t('tour.done') : t('tour.next')}
                </button>
            </div>
        </div>
    );
}
