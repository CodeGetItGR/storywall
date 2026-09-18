'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { getInitials } from '@/lib/format';
import { routes } from '@/lib/routes';

export function LandingProfileBadge() {
    const t = useTranslations('AccountDrawer');
    const { user } = useAuth();
    const accountName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.firstName || t('fallbackName');

    return (
        <Link
            href={routes.profile}
            aria-label={t('editProfile')}
            className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-bold text-[#151313] transition-opacity hover:opacity-60"
        >
            <Avatar src={user?.profilePictureUrl} initials={getInitials(accountName)} size="sm" alt="" />
            <span>{accountName}</span>
        </Link>
    );
}
