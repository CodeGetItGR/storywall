'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { TypeChips } from '@/components/event/create/wizard/type/TypeChips';
import { TypeFeatures } from '@/components/event/create/wizard/type/TypeFeatures';
import { TypePhoto } from '@/components/event/create/wizard/type/TypePhoto';
import { useCreateEventWizardTypeStep } from '@/hooks/useCreateEventWizardTypeStep';

// Step 1: a big photo of the picked type, the heading, the types as photo chips, then what the type
// includes. `progress` is the wizard's top row, drawn on the photo.
export function TypeStep({ progress }: { progress: ReactNode }) {
    const t = useTranslations('CreateEventPage.wizard.type');
    const { chips, picked, features, onSelect, onKeyDown } = useCreateEventWizardTypeStep();

    return (
        <div className="flex flex-col pb-6">
            {/* Photo */}
            {picked && <TypePhoto src={picked.photoSrc} alt={picked.name} progress={progress} />}

            {/* Types */}
            <div className="flex flex-col gap-3.5 px-5 pt-5">
                <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[21px] leading-tight tracking-[-0.01em] text-ink">
                    {t('heading')}
                </h1>
                <TypeChips chips={chips} labelledBy={CREATE_EVENT_WIZARD_HEADING_ID} onSelect={onSelect} onKeyDown={onKeyDown} />
            </div>

            {/* Features */}
            <div className="px-5 pt-7.5">
                <TypeFeatures {...features} />
            </div>
        </div>
    );
}
