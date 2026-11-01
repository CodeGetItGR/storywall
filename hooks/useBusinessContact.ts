'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { VendorContactCreatedDto, VendorContactRequestDto, VendorContactTopic } from '@/lib/api/types';

export const VENDOR_CONTACT_MESSAGE_MAX = 2000;

// The "Write to us" sheet: its fields, their errors, and the send.
export function useBusinessContact() {
    const t = useTranslations('BusinessPage.contact');
    const toErrorMessage = useApiErrorMessage();
    const [open, setOpen] = useState(false);
    const [topic, setTopic] = useState<VendorContactTopic | null>(null);
    const [message, setMessage] = useState('');
    const [topicError, setTopicError] = useState<string | null>(null);
    const [messageError, setMessageError] = useState<string | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const send = useMutation({
        mutationFn: (body: VendorContactRequestDto) => api.post<VendorContactCreatedDto>(endpoints.me.businessMessages, body),
    });

    const openSheet = useCallback(() => {
        setTopic(null);
        setMessage('');
        setTopicError(null);
        setMessageError(null);
        setSendError(null);
        setSent(false);
        setOpen(true);
    }, []);
    const closeSheet = useCallback(() => setOpen(false), []);

    const chooseTopic = useCallback((next: VendorContactTopic) => {
        setTopic(next);
        setTopicError(null);
    }, []);
    const changeMessage = useCallback((next: string) => {
        setMessage(next);
        setMessageError(null);
    }, []);

    const submit = useCallback(async () => {
        const text = message.trim();
        setTopicError(topic ? null : t('topicRequired'));
        setMessageError(text ? null : t('messageRequired'));
        if (!topic || !text) return;
        setSendError(null);
        try {
            await send.mutateAsync({ topic, message: text });
            setSent(true);
        } catch (error) {
            setSendError(toErrorMessage(error));
        }
    }, [message, send, t, toErrorMessage, topic]);

    return {
        open,
        openSheet,
        closeSheet,
        topic,
        setTopic: chooseTopic,
        message,
        setMessage: changeMessage,
        topicError,
        messageError,
        sendError,
        sent,
        isSending: send.isPending,
        submit,
    };
}
