'use client';

import { useCallback, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

export type ResendState = 'idle' | 'pending' | 'sent' | 'error';

// Sends the signed-in account's confirmation email again.
export function useResendVerificationEmail() {
    const { user } = useAuth();
    const [state, setState] = useState<ResendState>('idle');

    const resend = useCallback(async () => {
        if (!user?.email) return;
        setState('pending');
        try {
            await api.post(endpoints.auth.resendVerification, { email: user.email });
            setState('sent');
        } catch {
            setState('error');
        }
    }, [user]);

    return { state, resend };
}
