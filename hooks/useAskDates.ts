'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { eventKeys } from '@/hooks/useEvent';
import { vendorKeys } from '@/hooks/useVendors';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventDetailResponseDto, GuestInquiryRequestDto, GuestInquirySentDto, VendorRowDto } from '@/lib/api/types';
import { inquiryDateBounds, markCardInquirySent, markVendorInquirySent } from '@/lib/inquiries';

export type AskDatesTarget = { kind: 'vendor'; vendorId: string; name: string } | { kind: 'card'; name: string };

// "Ask about my date": the sheet's fields for whichever partner was tapped, the send, and the card's new state.
export function useAskDates(eventId: string) {
    const t = useTranslations('Vendors.inquiry');
    const toErrorMessage = useApiErrorMessage();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [target, setTarget] = useState<AskDatesTarget | null>(null);
    const [date, setDateValue] = useState('');
    const [phone, setPhoneValue] = useState('');
    const [email, setEmailValue] = useState('');
    const [note, setNote] = useState('');
    const [consent, setConsent] = useState(false);
    const [dateError, setDateError] = useState<string | null>(null);
    const [contactError, setContactError] = useState<string | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    // Fixed for the screen's life: a sheet left open past midnight still lets the server have the last word.
    const dateBounds = useMemo(() => inquiryDateBounds(), []);
    const send = useMutation({
        mutationFn: ({ to, body }: { to: AskDatesTarget; body: GuestInquiryRequestDto }) =>
            api.post<GuestInquirySentDto>(
                to.kind === 'vendor' ? endpoints.events.vendorInquiries(eventId, to.vendorId) : endpoints.events.partnerBrandingInquiries(eventId),
                body,
            ),
    });

    const open = useCallback(
        (next: AskDatesTarget) => {
            setTarget(next);
            setDateValue('');
            setPhoneValue('');
            setEmailValue(user?.email?.trim() ?? '');
            setNote('');
            setConsent(false);
            setDateError(null);
            setContactError(null);
            setSendError(null);
            setSent(false);
        },
        [user?.email],
    );
    const openForVendor = useCallback((vendorId: string, name: string) => open({ kind: 'vendor', vendorId, name }), [open]);
    const openForCard = useCallback((name: string) => open({ kind: 'card', name }), [open]);
    const close = useCallback(() => setTarget(null), []);

    const setDate = useCallback((next: string) => {
        setDateValue(next);
        setDateError(null);
    }, []);
    const setPhone = useCallback((next: string) => {
        setPhoneValue(next);
        setContactError(null);
    }, []);
    const setEmail = useCallback((next: string) => {
        setEmailValue(next);
        setContactError(null);
    }, []);

    const markSent = useCallback(
        (to: AskDatesTarget, sentAt: string) => {
            if (to.kind === 'vendor') {
                queryClient.setQueryData<VendorRowDto[]>(vendorKeys.list(eventId), (rows) => markVendorInquirySent(rows, to.vendorId, sentAt));
            } else {
                queryClient.setQueryData<EventDetailResponseDto>(eventKeys.detail(eventId), (event) => markCardInquirySent(event, sentAt));
            }
        },
        [eventId, queryClient],
    );

    const submit = useCallback(async () => {
        if (!target) return;
        const trimmedPhone = phone.trim();
        const trimmedEmail = email.trim();
        const trimmedNote = note.trim();
        setDateError(date ? null : t('dateRequired'));
        setContactError(trimmedPhone || trimmedEmail ? null : t('contactRequired'));
        if (!date || !(trimmedPhone || trimmedEmail) || !consent) return;
        setSendError(null);
        try {
            const result = await send.mutateAsync({
                to: target,
                body: {
                    eventDate: date,
                    ...(trimmedPhone && { phone: trimmedPhone }),
                    ...(trimmedEmail && { email: trimmedEmail }),
                    ...(trimmedNote && { note: trimmedNote }),
                    consent: true,
                },
            });
            markSent(target, result.sentAt);
            setSent(true);
        } catch (error) {
            setSendError(toErrorMessage(error));
        }
    }, [consent, date, email, markSent, note, phone, send, t, target, toErrorMessage]);

    return {
        target,
        openForVendor,
        openForCard,
        close,
        date,
        setDate,
        phone,
        setPhone,
        email,
        setEmail,
        note,
        setNote,
        consent,
        setConsent,
        dateError,
        contactError,
        sendError,
        sent,
        isSending: send.isPending,
        // Send stays off until the guest agrees to share their details.
        canSend: consent && !send.isPending,
        dateBounds,
        submit,
    };
}
