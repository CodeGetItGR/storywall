'use client';

import { ArrowLeft, CalendarHeart } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminNavBrand } from '@/components/admin/AdminNavBrand';
import { AdminNavFooter } from '@/components/admin/AdminNavFooter';
import { AdminNavLink } from '@/components/admin/AdminNavLink';
import { AppLink } from '@/components/ui/AppLink';
import type { SaveMyDateAdminNavGroup } from '@/hooks/useSaveMyDateAdminNav';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function SaveMyDateAdminNav({
    groups,
    email,
    userId,
    onLogoutAction,
    mobile = false,
    onNavigateAction,
}: {
    groups: SaveMyDateAdminNavGroup[];
    email?: string | null;
    userId?: string | null;
    onLogoutAction: () => Promise<void>;
    mobile?: boolean;
    onNavigateAction?: () => void;
}) {
    const t = useTranslations('AdminPage');

    return (
        <aside
            className={cn(
                'flex flex-col gap-5 bg-card px-3 py-4.5',
                mobile ? 'min-h-full' : 'hidden h-full w-64 shrink-0 overflow-y-auto border-r border-border lg:flex',
            )}
        >
            {/* Back */}
            <AppLink
                href={routes.admin}
                onClick={onNavigateAction}
                className="-mb-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
            >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('saveMyDate.backToAdmin')}
            </AppLink>

            {/* Brand */}
            <AdminNavBrand icon={CalendarHeart} title={t('saveMyDate.title')} eyebrow={t('eyebrow')} />

            {/* Sections */}
            {groups.map((group) => (
                <nav key={group.key}>
                    <p className="mb-1.5 px-2.5 text-[10.5px] font-bold tracking-[0.08em] text-ink-faint uppercase">{group.label}</p>
                    <div className="space-y-px">
                        {group.items.map((item) => (
                            <AdminNavLink
                                key={item.key}
                                href={item.href}
                                label={item.label}
                                icon={item.icon}
                                active={item.active}
                                onNavigateAction={onNavigateAction}
                            />
                        ))}
                    </div>
                </nav>
            ))}

            {/* Footer */}
            <AdminNavFooter email={email} userId={userId} onLogoutAction={onLogoutAction} />
        </aside>
    );
}
