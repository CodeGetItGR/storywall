'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { eventKeys } from '@/hooks/useEvent';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { PartnerBrandingAcceptanceRequestDto, PartnerBrandingNoticeDto } from '@/lib/api/types';

type PartnerBrandingAnswer = 'accept' | 'decline';

/**
 * The host's answer to a partner the event is linked to. Either answer
 * reloads the event, which then carries no prompt. When the wording has
 * changed since it was shown (5153), the reload brings the new notice back.
 * Closing without an answer hides it until the next visit.
 */
export function usePartnerBrandingPrompt(eventId: string, prompt: PartnerBrandingNoticeDto | null) {
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();
    const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

    const answer = useMutation({
        mutationFn: (choice: PartnerBrandingAnswer) => {
            if (choice === 'decline') return api.post<void>(endpoints.events.partnerBrandingDecline(eventId));
            const body: PartnerBrandingAcceptanceRequestDto = { noticeVersion: prompt!.noticeVersion };
            return api.post<void>(endpoints.events.partnerBrandingAcceptance(eventId), body);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
    });

    const accept = useCallback(() => answer.mutate('accept'), [answer]);
    const decline = useCallback(() => answer.mutate('decline'), [answer]);
    const dismiss = useCallback(() => setDismissedVersion(prompt?.noticeVersion ?? null), [prompt]);

    // An outdated notice is not an error to show: the reloaded event asks again.
    const outdated = getErrorCode(answer.error) === ERROR_CODES.PARTNER_BRANDING_NOTICE_OUTDATED;

    return {
        prompt,
        open: prompt !== null && prompt.noticeVersion !== dismissedVersion,
        accept,
        dismiss,
        decline,
        pendingChoice: answer.isPending ? answer.variables : null,
        error: answer.error && !outdated ? toErrorMessage(answer.error) : null,
    };
}
