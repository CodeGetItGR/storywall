'use client';

import { Menu } from '@base-ui/react/menu';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';

const tabItems = [
    { href: routes.feed, icon: '/icons/home.svg', key: 'home' },
    { href: routes.tools.playlist, icon: '/icons/music.svg', key: 'playlist' },
];

interface TabLinkProps {
    href: string;
    icon: string;
    label: string;
    active: boolean;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

function TabLink({ href, icon, label, active, onClick }: TabLinkProps) {
    return (
        <Link href={href} onClick={onClick} className="flex min-w-12 flex-col items-center gap-0.5 px-3 py-1" aria-label={label} aria-current={active ? 'page' : undefined}>
            <Image src={icon} alt={label} width={20} height={20} className={cn('h-5 w-5 transition-opacity', active ? 'opacity-100' : 'opacity-70')} loading="eager" />
        </Link>
    );
}

export function MobileTabBar() {
    const t = useTranslations('MobileTabBar');
    const pathname = usePathname();
    const { openPostComposer, openSongComposer, openStoryCapture, canCompose, canComposeSong } = useComposer();
    const isFeedDetailPage = pathname.startsWith('/feed/');

    const [home, playlist] = tabItems;
    const homeActive = pathname === home.href || pathname.startsWith(home.href + '/');
    const playlistActive = pathname === playlist.href || pathname.startsWith(playlist.href + '/');

    function handleHomeClick(event: MouseEvent<HTMLAnchorElement>) {
        if (!isFeedDetailPage) return;

        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <nav
            aria-label={t('mobileNavigation')}
            className="fixed bottom-0 left-1/2 z-40 flex h-16 w-9/10 -translate-x-1/2 items-center justify-around rounded-t-2xl border-t border-border bg-white/90 px-5 lg:hidden"
        >
            <TabLink href={home.href} icon={home.icon} label={t(`items.${home.key}`)} active={homeActive} onClick={handleHomeClick} />

            <Menu.Root>
                <Menu.Trigger aria-label={t('compose')} className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand shadow-md">
                    <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
                </Menu.Trigger>
                <Menu.Portal>
                    <Menu.Positioner side="top" sideOffset={8} className="z-50">
                        <Menu.Popup className="min-w-36 rounded-2xl border border-border bg-background py-1 shadow-[0_2px_16px_0_rgba(36,31,26,0.15)] outline-none">
                            <Menu.Item
                                onClick={openPostComposer}
                                disabled={!canCompose}
                                className="mx-1 flex cursor-pointer justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                                {t('composeMenu.post')}
                                <Image src="/icons/post.svg" alt={t('composeMenu.post')} width={20} height={20} className="h-5 w-5 transition-opacity" loading="eager" />
                            </Menu.Item>
                            <Menu.Item
                                onClick={openStoryCapture}
                                disabled={!canCompose}
                                className="mx-1 flex cursor-pointer justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                                {t('composeMenu.story')}
                                <Image src="/icons/story.svg" alt={t('composeMenu.story')} width={20} height={20} className="h-5 w-5 transition-opacity" loading="eager" />
                            </Menu.Item>
                            <Menu.Item
                                onClick={openSongComposer}
                                disabled={!canComposeSong}
                                className="mx-1 flex cursor-pointer justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                                {t('composeMenu.song')}
                                <Image src="/icons/music.svg" alt={t('composeMenu.song')} width={20} height={20} className="h-5 w-5 transition-opacity" loading="eager" />
                            </Menu.Item>
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>

            <TabLink href={playlist.href} icon={playlist.icon} label={t(`items.${playlist.key}`)} active={playlistActive} />
        </nav>
    );
}
