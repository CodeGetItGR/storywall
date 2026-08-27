'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AccountDrawer } from '@/components/account';
import Avatar from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { getInitials } from '@/lib/format';
import { routes } from '@/lib/routes';

export function HomeHeader({ open, onOpenAction, onCloseAction }: { open: boolean; onOpenAction: () => void; onCloseAction: () => void }) {
    const t = useTranslations('HomePage');
    const tAccount = useTranslations('AccountDrawer');
    const tNotifications = useTranslations('NotificationsPage');
    const { user } = useAuth();
    const { data: unreadCount = 0 } = useUnreadNotificationCount();
    const accountName = user?.displayName ?? tAccount('fallbackName');
    const firstName = accountName.split(' ')[0];

    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <h1 className="truncate text-2xl font-bold text-ink">{t('greeting', { name: firstName })}</h1>
            <div className="flex shrink-0 items-center gap-3">
                <Link href={routes.notifications} aria-label={tNotifications('title')} className="relative flex h-11 w-11 items-center justify-center">
                    <Bell className="h-5 w-5 text-ink" strokeWidth={1.8} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white tabular-nums">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Link>
                <button type="button" onClick={onOpenAction} aria-label={tAccount('drawerLabel')} aria-haspopup="dialog" aria-expanded={open}>
                    <Avatar initials={getInitials(accountName)} size="md" alt={accountName} />
                </button>
            </div>
            <AccountDrawer open={open} onCloseAction={onCloseAction} />
        </div>
    );
}
