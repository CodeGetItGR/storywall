'use client';

import { useState } from 'react';

import { useAdminEmailPreview, useAdminEmailTemplates, useSendAdminEmailMutation } from '@/hooks/useAdminEmails';
import { useAdminEvents } from '@/hooks/useAdminEvents';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Locale } from '@/i18n/config';
import { ADMIN_EMAIL_TEMPLATE_ORDER, adminEmailRequest } from '@/lib/adminEmails';
import { EMPTY_EVENT_FILTERS } from '@/lib/adminEvents';
import type { AdminEmailTemplateKey, UserResponseDto } from '@/lib/api/types';

const EVENT_PICKER_SIZE = 50;
const TEXT_DEBOUNCE_MS = 400;

// The Send email drawer: which template, for which event, in which language, and the send itself.
export function useAccountEmailForm(account: UserResponseDto) {
    const toErrorMessage = useApiErrorMessage();
    const templatesQuery = useAdminEmailTemplates(account.id);
    const eventsQuery = useAdminEvents({ filters: { ...EMPTY_EVENT_FILTERS, hostUserId: account.id }, page: 0, size: EVENT_PICKER_SIZE });
    const send = useSendAdminEmailMutation(account.id);

    const [pickedTemplate, setPickedTemplate] = useState<AdminEmailTemplateKey | null>(null);
    const [locale, setLocale] = useState<Locale>(account.locale ?? 'en');
    const [pickedEventId, setPickedEventId] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [sent, setSent] = useState(false);

    const templates = ADMIN_EMAIL_TEMPLATE_ORDER.map((key) => templatesQuery.data?.find((item) => item.key === key)).filter(
        (item) => item !== undefined,
    );
    const isAvailable = (key: AdminEmailTemplateKey) => templates.some((item) => item.key === key && item.available);
    // Until the admin picks one, the first template this account can receive.
    const template = pickedTemplate ?? templates.find((item) => item.available)?.key ?? null;
    const events = eventsQuery.data?.content ?? [];
    const eventId = pickedEventId || events[0]?.id || '';
    // Typing only re-renders the preview once the admin pauses.
    const debouncedSubject = useDebouncedValue(subject, TEXT_DEBOUNCE_MS);
    const debouncedBody = useDebouncedValue(body, TEXT_DEBOUNCE_MS);
    const request = adminEmailRequest({ template, locale, eventId, subject, body });
    const previewRequest = adminEmailRequest({ template, locale, eventId, subject: debouncedSubject, body: debouncedBody });
    const previewQuery = useAdminEmailPreview(account.id, previewRequest);

    function changeTemplate(next: AdminEmailTemplateKey) {
        if (!isAvailable(next)) return;
        setPickedTemplate(next);
        send.reset();
    }

    function requestSend() {
        if (request) setConfirmOpen(true);
    }

    function closeConfirm() {
        if (!send.isPending) setConfirmOpen(false);
    }

    async function confirmSend() {
        if (!request) return;
        try {
            await send.mutateAsync(request);
            setSent(true);
        } catch {
            // The error shows in the drawer.
        } finally {
            setConfirmOpen(false);
        }
    }

    return {
        templates,
        templatesQuery,
        template,
        changeTemplate,
        locale,
        setLocale,
        events,
        eventsQuery,
        eventId,
        setEventId: setPickedEventId,
        subject,
        setSubject,
        body,
        setBody,
        request,
        preview: previewQuery.data ?? null,
        isPreviewLoading: previewQuery.isFetching,
        previewError: previewQuery.error ? toErrorMessage(previewQuery.error) : null,
        canSend: request !== null && !send.isPending,
        isSending: send.isPending,
        sendError: send.error ? toErrorMessage(send.error) : null,
        confirmOpen,
        requestSend,
        closeConfirm,
        confirmSend,
        sent,
    };
}

export type AccountEmailForm = ReturnType<typeof useAccountEmailForm>;
