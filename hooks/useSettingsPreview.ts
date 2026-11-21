'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { useCreateEventFieldLabels } from '@/hooks/useCreateEventFieldLabels';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { INCIDENT_MODE } from '@/lib/incident';
import { formatPreviewDateTime, getSettingsParts, type SettingsPart } from '@/lib/settingsPreview';

// Tailwind's `lg`: the editor opens as a panel beside the preview instead of a sheet.
const LG_MEDIA_QUERY = '(min-width: 64rem)';

// The Settings page (KAN-228): the invite preview's parts, which one is being edited, and how.
export function useSettingsPreview(event: EventDetailResponseDto, canWrite: boolean, canUploadCoverProp: boolean) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const fieldLabels = useCreateEventFieldLabels(event.eventType);
    const isDesktop = useMediaQuery(LG_MEDIA_QUERY);
    const [openPart, setOpenPart] = useState<SettingsPart | null>(null);
    const parts = getSettingsParts(event);
    const canUploadCover = canUploadCoverProp && !INCIDENT_MODE;

    const labels: Record<SettingsPart, string> = {
        cover: t('settings.coverPhoto.label'),
        title: fieldLabels.title,
        date: fieldLabels.startAt,
        location: fieldLabels.locationName,
        description: t('settings.fields.description'),
    };

    function canEdit(part: SettingsPart): boolean {
        return part === 'cover' ? canUploadCover : canWrite;
    }

    function openEditor(part: SettingsPart) {
        if (canEdit(part)) setOpenPart(part);
    }

    function closeEditor() {
        setOpenPart(null);
    }

    return {
        parts,
        labels,
        openPart,
        isDesktop,
        canEdit,
        canUploadCover,
        openEditor,
        closeEditor,
        startText: formatPreviewDateTime(locale, event.schedule.startAt, event.schedule.timezone),
        endText: formatPreviewDateTime(locale, event.schedule.endAt, event.schedule.timezone),
    };
}
