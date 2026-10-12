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
    // Until the admin picks one, the first template this account can receive. A pick that stops being
    // available (e.g. after a 409) stays selected, so the picker shows why and Send stays off.
    const template = pickedTemplate ?? templates.find((item) => item.available)?.key ?? null;
    const isTemplateAvailable = template !== null && isAvailable(template);
    const sendableTemplate = isTemplateAvailable ? template : null;
    const events = eventsQuery.data?.content ?? [];
    const eventId = pickedEventId || events[0]?.id || '';
    // Typing only re-renders the preview once the admin pauses.
    const debouncedSubject = useDebouncedValue(subject, TEXT_DEBOUNCE_MS);
    const debouncedBody = useDebouncedValue(body, TEXT_DEBOUNCE_MS);
    const request = adminEmailRequest({ template: sendableTemplate, locale, eventId, subject, body });
    const previewRequest = adminEmailRequest({ template: sendableTemplate, locale, eventId, subject: debouncedSubject, body: debouncedBody });
    const previewQuery = useAdminEmailPreview(account.id, previewRequest);

    // A send error belongs to the email as it was; any change clears it.
    function changeInput<T>(setValue: (value: T) => void) {
        return (value: T) => {
            setValue(value);
            send.reset();
        };
    }

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
        isTemplateAvailable,
        changeTemplate,
        locale,
        setLocale: changeInput(setLocale),
        events,
        isEventsLoading: eventsQuery.isLoading,
        eventsError: eventsQuery.error ? toErrorMessage(eventsQuery.error) : null,
        eventId,
        setEventId: changeInput(setPickedEventId),
        subject,
        setSubject: changeInput(setSubject),
        body,
        setBody: changeInput(setBody),
        request,
        // keepPreviousData would otherwise keep showing the last email once there is no request.
        preview: previewRequest ? (previewQuery.data ?? null) : null,
        isPreviewLoading: previewRequest !== null && previewQuery.isFetching,
        previewError: previewRequest && previewQuery.error ? toErrorMessage(previewQuery.error) : null,
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
