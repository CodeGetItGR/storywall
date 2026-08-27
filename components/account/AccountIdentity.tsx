'use client';

import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { getInitials } from '@/lib/format';

interface AccountIdentityProps {
    displayName: string | null;
    email: string | null;
}

export function AccountIdentity({ displayName, email }: AccountIdentityProps) {
    const t = useTranslations('AccountDrawer');
    const accountName = displayName ?? t('fallbackName');

    return (
        <div className="flex items-center gap-4">
            <Avatar initials={getInitials(accountName)} size="lg" alt={accountName} />
            <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-ink">{accountName}</h1>
                {email && <p className="truncate text-sm text-ink-muted">{email}</p>}
            </div>
        </div>
    );
}
