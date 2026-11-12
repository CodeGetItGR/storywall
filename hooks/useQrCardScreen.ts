'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect } from 'react';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useQrCardDesigner } from '@/hooks/useQrCardDesigner';
import { useQrCardExport } from '@/hooks/useQrCardExport';
import { useQrCardTemplates } from '@/hooks/useQrCardTemplates';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import type { QrCardTemplateDto } from '@/lib/api/types';
import { eventHomeHref } from '@/lib/liteEvents';
import { type QrCardLine, qrCardLineKey } from '@/lib/qrCard';
import { routes } from '@/lib/routes';

const NO_TEMPLATES: QrCardTemplateDto[] = [];

export type QrCardScreenStatus = 'loading' | 'missing' | 'ready';

// The card page for one share link or the gallery QR. An event without QR cards treats the page as
// missing, as GalleryQrScreen does for a feature that's off. A failed design list keeps Plain.
export function useQrCardScreen() {
    const t = useTranslations('QrCardPage');
    const router = useRouter();
    const { qrLinkId } = useParams<{ qrLinkId: string }>();
    const { activeEvent, eventId } = useEventRouteContext();
    const links = useEventQrLinks(eventId);
    const templates = useQrCardTemplates(eventId);

    const unavailable = templates.data?.available === false;
    useEffect(() => {
        if (unavailable) router.replace(routes.eventNotFound);
    }, [router, unavailable]);

    const qrLink = links.data?.find((link) => link.id === qrLinkId) ?? null;
    const status: QrCardScreenStatus =
        links.isLoading || templates.isLoading ? 'loading' : !qrLink || qrLink.status === 'REVOKED' ? 'missing' : 'ready';

    const lineKey = qrLink ? qrCardLineKey(qrLink.targetType, activeEvent.modules) : null;
    const designer = useQrCardDesigner({
        templates: templates.data?.templates ?? NO_TEMPLATES,
        defaults: { title: activeEvent.title, line: lineKey ? t(`lines.${lineKey}`) : '' },
        lineKey,
    });
    const exporter = useQrCardExport({ font: designer.style.headingFont, title: designer.text.title, size: designer.size });
    const lines: QrCardLine[] = [{ text: designer.text.line, tone: 'body' }];

    const { refetch } = templates;
    const retryTemplates = useCallback(() => void refetch(), [refetch]);

    return {
        status,
        unavailable,
        qrUrl: qrLink?.publicUrl ?? '',
        // A guest code's card goes back to the event's home.
        backHref: qrLink?.targetType === 'GUEST' ? eventHomeHref(activeEvent) : routes.events.invitationsQr(eventId),
        designer,
        exporter,
        lines,
        label: t('cardLabel', { title: designer.text.title }),
        templatesFailed: templates.isError,
        retryTemplates,
    };
}
