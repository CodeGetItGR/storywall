import { useTranslations } from 'next-intl';

import type { SectionTransitionArt } from '@/lib/invitation/render';

type SectionTransitionProps = { art: SectionTransitionArt };

// Theme art over the seam between two sections, with its own art for phones when
// the theme has one. It takes up no height.
export function SectionTransition({ art }: SectionTransitionProps) {
    const t = useTranslations('InvitationRenderer');
    const alt = art.name || t('imageAlt');
    const edge = art.edge === 'top' ? 'is-top' : 'is-bottom';

    return (
        <div className={art.mobile ? 'wedart-transition-picture has-mobile' : 'wedart-transition-picture'} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={`wedart-section-transition wedart-transition-desktop ${edge}`} src={art.desktop} alt={alt} />
            {art.mobile && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={`wedart-section-transition wedart-transition-mobile ${edge}`} src={art.mobile} alt={alt} />
            )}
        </div>
    );
}
