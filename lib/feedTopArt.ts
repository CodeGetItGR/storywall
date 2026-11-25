import type { RenderContext } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';

// A Save my date theme's top illustration, as the invitation draws it (KAN-292).
export type FeedTopArt = { src: string; scale: number; animation: NonNullable<ThemeDesign['art']['main']>['animation'] };

// Null on a theme without one, the wall theme among them, or without its image.
export function feedTopArt({ theme, media }: Pick<RenderContext, 'theme' | 'media'>): FeedTopArt | null {
    const art = theme.art.main;
    const src = art && media(art.image.mediaId);
    return art && src ? { src, scale: art.scale, animation: art.animation } : null;
}
