'use client';

import { useEffect } from 'react';

import { GuestWishFormContent } from '@/components/qrGuest/GuestWishFormContent';
import { useGuestWishForm } from '@/hooks/useGuestWishForm';

interface GuestWishFormProps {
    token: string;
    // Told when the sent screen shows or hides, so the page can drop its own header there.
    onSentChange?: (sent: boolean) => void;
}

export function GuestWishForm({ token, onSentChange }: GuestWishFormProps) {
    const form = useGuestWishForm(token);

    useEffect(() => {
        onSentChange?.(form.sent);
    }, [form.sent, onSentChange]);

    return <GuestWishFormContent form={form} />;
}
