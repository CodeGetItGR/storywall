import { useTranslations } from 'next-intl';

import { litePlanArtKind } from '@/hooks/useLitePlanArt';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The lite plans' details step: which plan picture to show, its alt text and the title on it.
export function useLiteDetailsStep() {
    const t = useTranslations('CreateEventPage.wizard.details.liteArt');
    const form = useCreateEventForm();
    const typeCopy = useLocalizedAppEventTypeCopy();
    const kind = litePlanArtKind(form.selectedPlan?.moduleKeys);

    return {
        art: kind ? { kind, eventType: form.selectedEventType, alt: t(kind), title: form.title.trim() || typeCopy(form.selectedEventType).name } : null,
    };
}
