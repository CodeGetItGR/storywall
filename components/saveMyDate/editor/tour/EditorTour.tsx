'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { EditorTourCard } from '@/components/saveMyDate/editor/tour/EditorTourCard';
import { EditorTourToolRows } from '@/components/saveMyDate/editor/tour/EditorTourToolRows';
import type { EditorTourState } from '@/hooks/useEditorTour';
import { useTourCardPlacement } from '@/hooks/useTourCardPlacement';
import { useTourKeyboard } from '@/hooks/useTourKeyboard';
import { useTourSpotlight } from '@/hooks/useTourSpotlight';
import { type EditorTourStep, spotlightRect } from '@/lib/invitation/editorTour';

type EditorTourProps = { tour: EditorTourState };

// The editor tour over the editor: the rest is dimmed, the part a step talks about stays lit.
export function EditorTour({ tour }: EditorTourProps) {
    if (!tour.step) return null;
    return <EditorTourStepView tour={tour} step={tour.step} />;
}

function EditorTourStepView({ tour, step }: { tour: EditorTourState; step: EditorTourStep }) {
    const t = useTranslations('InvitationEditor.tour');
    const target = useTourSpotlight(step.target);
    const spot = useMemo(() => (target ? spotlightRect(target, { width: window.innerWidth, height: window.innerHeight }) : null), [target]);
    const { cardRef, placement } = useTourCardPlacement(spot, step.id);
    useTourKeyboard(cardRef, tour.isOpen, tour.close);

    return (
        // Covers the editor so nothing behind the tour reacts to a tap.
        <div className="fixed inset-0 z-80" data-editor-tour-overlay="">
            {/* Shade */}
            {spot ? (
                <div
                    aria-hidden="true"
                    style={spot}
                    className="pointer-events-none fixed rounded-[14px] shadow-[0_0_0_9999px_rgba(10,11,14,0.8),0_0_0_3px_rgba(255,255,255,0.95)] transition-[left,top,width,height] duration-200 motion-reduce:transition-none"
                />
            ) : (
                <div aria-hidden="true" className="fixed inset-0 bg-[rgba(10,11,14,0.8)]" />
            )}

            {/* Card */}
            <EditorTourCard
                cardRef={cardRef}
                placement={placement}
                stepKey={step.id}
                position={tour.index + 1}
                total={tour.total}
                title={t(`${step.id}Title`)}
                body={t(`${step.id}Body`)}
                isFirst={tour.isFirst}
                isLast={tour.isLast}
                onBack={tour.back}
                onNext={tour.next}
                onSkip={tour.close}
            >
                {step.id === 'sectionTools' && <EditorTourToolRows />}
            </EditorTourCard>
        </div>
    );
}
