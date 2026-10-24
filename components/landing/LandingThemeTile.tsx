import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { LandingTheme } from '@/lib/landingThemes';

export function LandingThemeTile({ theme }: { theme: LandingTheme }) {
    return (
        <li className="w-[40vw] max-w-45 shrink-0 snap-start rounded-[18px] bg-white p-1.5 pb-3 shadow-[0_1px_0_rgba(21,19,19,0.04),0_0_0_1px_rgba(21,19,19,0.06)] min-[761px]:w-auto min-[761px]:max-w-none">
            {/* Swatch */}
            <div className="relative aspect-square overflow-hidden rounded-[13px]" style={{ backgroundColor: theme.backgroundColor }}>
                <ProtectedImage
                    alt={theme.name}
                    className="object-contain"
                    fill
                    loading="lazy"
                    sizes="(min-width: 761px) 190px, 40vw"
                    src={theme.illustrationUrl}
                />
            </div>
            {/* Name */}
            <p className="mt-2.5 truncate px-1 text-center text-[13px] leading-snug text-ink min-[761px]:text-[clamp(13px,0.95vw,15px)]">
                {theme.name}
            </p>
        </li>
    );
}
