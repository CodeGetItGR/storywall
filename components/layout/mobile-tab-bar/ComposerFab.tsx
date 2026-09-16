'use client';

import { Menu } from '@base-ui/react/menu';
import { Camera, Plus, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useState } from 'react';
import { PiMusicNotesPlusDuotone } from 'react-icons/pi';

import { cn } from '@/lib/utils';
import { useComposer } from '@/providers/ComposerProvider';
import { useMobileChrome } from '@/providers/MobileChromeProvider';

// On lg+ there's no tab bar to tuck behind, and the button is anchored to the
// feed column's right edge (viewport width minus the 80px nav rail and 300px
// right context panel, halved) instead of the raw viewport corner. z-46 sits
// above the tab bar (z-40) and the compose backdrop (z-45) but under every
// modal (z-50).
const composerFabClassName =
    'motion-fab group fixed right-4 bottom-20 z-46 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand shadow-md will-change-transform max-lg:translate-y-[var(--composer-lower-y)] lg:right-[calc(50vw-210px)] lg:bottom-6';

const composerMenuItemClassName =
    'motion-menu-item flex min-h-14 cursor-pointer items-center justify-between rounded-[1.45rem] border border-[#efc0dc] bg-background px-5 text-sm font-medium text-ink shadow-[0_6px_18px_rgba(36,31,26,0.08)] outline-none hover:-translate-y-0.5 hover:border-[#f0b47f]';

interface ComposerFabProps {
    // Animates the button out (and keeps its menu closed) while an overlay is open.
    hidden: boolean;
}

export function ComposerFab({ hidden }: ComposerFabProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [lowered, setLowered] = useState(false);
    const t = useTranslations('MobileTabBar');
    const { openPostComposer, openSongComposer, openStoryCapture, canComposePost, canComposeStory, canComposeSong } = useComposer();
    const { isMobileTabBarHidden } = useMobileChrome();

    // The button stays mounted while hidden so it can animate out, so its menu
    // has to be closed explicitly rather than by unmounting.
    if (hidden && menuOpen) setMenuOpen(false);

    useEffect(() => {
        const timeoutId = window.setTimeout(
            () => {
                setLowered(isMobileTabBarHidden);
            },
            isMobileTabBarHidden ? 100 : 0
        );

        return () => window.clearTimeout(timeoutId);
    }, [isMobileTabBarHidden]);

    function handleMenuClose() {
        setMenuOpen(false);
    }

    const buttonStyle = { '--composer-lower-y': lowered ? '4rem' : '0rem' } as CSSProperties;

    return (
        <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
            {/* Compose */}
            <Menu.Trigger
                aria-label={t('compose')}
                inert={hidden}
                data-hidden={hidden || undefined}
                className={cn(composerFabClassName, menuOpen && 'invisible')}
                style={buttonStyle}
            >
                <span className="flex h-full w-full items-center justify-center transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95">
                    <Plus
                        className="h-6 w-6 text-white transition-transform duration-200 ease-out group-data-popup-open:rotate-45"
                        strokeWidth={2.5}
                    />
                </span>
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Backdrop className="motion-menu-backdrop fixed inset-0 z-45 bg-black/10 opacity-100 backdrop-blur-[2px]" />
                {/* Compose close control */}
                <button type="button" aria-label={t('compose')} onClick={handleMenuClose} className={composerFabClassName} style={buttonStyle}>
                    <span className="flex h-full w-full items-center justify-center transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95">
                        <Plus className="h-6 w-6 rotate-45 text-white" strokeWidth={2.5} />
                    </span>
                </button>
                <Menu.Positioner side="top" align="end" sideOffset={8} className="z-50">
                    <Menu.Popup className="motion-popover flex w-46 flex-col gap-2 border-0 bg-transparent p-0 shadow-none outline-none">
                        {canComposePost && (
                            <Menu.Item onClick={openPostComposer} className={composerMenuItemClassName}>
                                {t('composeMenu.post')}
                                <Camera className="h-5 w-5 shrink-0 text-ink" aria-hidden="true" strokeWidth={1.8} />
                            </Menu.Item>
                        )}
                        {canComposeStory && (
                            <Menu.Item onClick={openStoryCapture} className={composerMenuItemClassName}>
                                {t('composeMenu.story')}
                                <PlusCircle className="h-5 w-5 shrink-0 text-ink" aria-hidden="true" strokeWidth={1.8} />
                            </Menu.Item>
                        )}
                        {canComposeSong && (
                            <Menu.Item onClick={openSongComposer} className={composerMenuItemClassName}>
                                {t('composeMenu.song')}
                                <PiMusicNotesPlusDuotone className="h-5 w-5 shrink-0 text-ink" aria-hidden="true" strokeWidth={1.8} />
                            </Menu.Item>
                        )}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}
