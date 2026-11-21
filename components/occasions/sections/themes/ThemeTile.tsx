import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { LandingTheme } from '@/lib/landingThemes';

// One theme in the grid: its illustration on its own colour, the name under it.
export function ThemeTile({ alt, theme }: { alt: string; theme: LandingTheme }) {
    return (
        <li className="rounded-[20px] bg-white px-1.75 pt-1.75 pb-3 text-center shadow-[0_10px_24px_-14px_rgba(70,38,24,0.35)]">
            {/* Swatch */}
            <div className="relative aspect-square overflow-hidden rounded-[14px]" style={{ backgroundColor: theme.backgroundColor }}>
                <ProtectedImage alt={alt} className="object-contain" fill loading="lazy" sizes="(min-width: 761px) 150px, 30vw" src={theme.illustrationUrl} />
            </div>
            {/* Name */}
            <span className="mt-2.25 block text-[13px] leading-[1.25]">{theme.name}</span>
        </li>
    );
}
