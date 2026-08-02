'use client';

import { Menu } from '@base-ui/react/menu';
import { Bell, Home, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ComponentType } from 'react';

import { cn } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';

const tabItems = [
    { href: '/profile', icon: Home, key: 'home' },
    { href: '/notifications', icon: Bell, key: 'alerts' },
];

interface TabLinkProps {
    href: string;
    icon: ComponentType<{ className?: string; strokeWidth?: number }>;
    label: string;
    active: boolean;
}

function TabLink({ href, icon: Icon, label, active }: TabLinkProps) {
    return (
        <Link href={href} className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-12" aria-label={label} aria-current={active ? 'page' : undefined}>
            <Icon className={cn('w-5 h-5 transition-colors', active ? 'text-primary' : 'text-ink-faint')} strokeWidth={active ? 2.5 : 1.8} />
            <span className={cn('text-[10px] font-medium transition-colors', active ? 'text-primary' : 'text-ink-faint')}>{label}</span>
        </Link>
    );
}

export function MobileTabBar() {
    const t = useTranslations('MobileTabBar');
    const pathname = usePathname();
    const { openPostComposer, openStoryCapture, canCompose } = useComposer();

    const [home, alerts] = tabItems;
    const homeActive = pathname === home.href || pathname.startsWith(home.href + '/');
    const alertsActive = pathname === alerts.href || pathname.startsWith(alerts.href + '/');

    return (
        <nav
            aria-label={t('mobileNavigation')}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 h-16 bg-white/90 border-t border-border rounded-t-2xl flex items-center justify-around z-40 lg:hidden px-5 w-9/10"
        >
            <TabLink href={home.href} icon={home.icon} label={t(`items.${home.key}`)} active={homeActive} />

            <Menu.Root>
                <Menu.Trigger aria-label={t('compose')} className="w-12 h-12 rounded-full bg-gradient-brand flex items-center justify-center shadow-md">
                    <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
                </Menu.Trigger>
                <Menu.Portal>
                    <Menu.Positioner side="top" sideOffset={8} className="z-50">
                        <Menu.Popup className="bg-background rounded-2xl shadow-[0_2px_16px_0_rgba(36,31,26,0.15)] border border-border py-1 min-w-36 outline-none">
                            <Menu.Item
                                onClick={openPostComposer}
                                disabled={!canCompose}
                                className="mx-1 rounded-lg px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted cursor-pointer outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                                {t('composeMenu.post')}
                            </Menu.Item>
                            <Menu.Item
                                onClick={openStoryCapture}
                                disabled={!canCompose}
                                className="mx-1 rounded-lg px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted cursor-pointer outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                                {t('composeMenu.story')}
                            </Menu.Item>
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>

            <TabLink href={alerts.href} icon={alerts.icon} label={t(`items.${alerts.key}`)} active={alertsActive} />
        </nav>
    );
}
