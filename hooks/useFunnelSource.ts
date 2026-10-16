'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { SIGNUP_CHANNELS } from '@/lib/adminFunnel';
import type { SignupChannel } from '@/lib/api/types';

// The one channel the Funnel is narrowed to, or null for all of them.
export function useFunnelSource() {
    const t = useTranslations('AdminPage.signupChannel');
    const [channel, setChannel] = useState<SignupChannel | null>(null);

    const options = useMemo(() => SIGNUP_CHANNELS.map((value) => ({ value, label: t(value) })), [t]);

    const handleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
        setChannel((event.target.value || null) as SignupChannel | null);
    }, []);

    return { channel, options, handleChange };
}
