'use client';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useContentLimits } from '@/hooks/useContentLimits';
import { useCreateEventFieldLabels } from '@/hooks/useCreateEventFieldLabels';
import { useEventTypeVoice } from '@/hooks/useEventTypeVoice';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export function EventTitleField() {
    const { selectedEventType, title, titleError, onTitleChange } = useCreateEventForm();
    const voice = useEventTypeVoice(selectedEventType);
    const labels = useCreateEventFieldLabels(selectedEventType);
    const limits = useContentLimits();

    return (
        <FormFieldLabel label={labels.title} required>
            <input
                type="text"
                required
                maxLength={limits.eventTitleMaxLength}
                value={title}
                onChange={onTitleChange}
                placeholder={voice.titlePlaceholder}
                className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30"
            />
            {titleError && <span className="text-xs text-rose-500">{titleError}</span>}
        </FormFieldLabel>
    );
}
