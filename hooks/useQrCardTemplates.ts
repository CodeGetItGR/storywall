import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { QrCardTemplateListDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

export const qrCardTemplateKeys = {
    list: (eventId: string) => ['events', eventId, 'qr-card-templates'] as const,
};

export function useQrCardTemplates(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: qrCardTemplateKeys.list(eventId ?? ''),
        queryFn: () => api.get<QrCardTemplateListDto>(endpoints.events.qrCardTemplates(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated,
    });
}

// The card page for one QR, or null (the plain popup print stays) while the list loads, when it
// fails, or when the event has no QR cards.
export function useQrCardHref(eventId: string | null, qrLinkId: string): string | null {
    const { data } = useQrCardTemplates(eventId);
    return eventId && data?.available ? routes.events.qrCard(eventId, qrLinkId) : null;
}
