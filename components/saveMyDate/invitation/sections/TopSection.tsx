import { useTranslations } from 'next-intl';

import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { artAnimationClass, artImageStyle, type RenderContext, type TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

const MAIN_ART_BASE = 420;

type TopSectionProps = {
    section: Extract<InvitationSection, { type: 'top' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

export function TopSection({ section, contrast, ctx }: TopSectionProps) {
    const t = useTranslations('InvitationRenderer');
    const art = ctx.theme.art.main;
    const src = art ? ctx.media(art.image.mediaId) : undefined;

    return (
        <div className="section-inner">
            {/* Art */}
            {art && src && (
                <div className="wedart-asset-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        className={['hero-art', artAnimationClass(art.animation)].filter(Boolean).join(' ')}
                        src={src}
                        alt={t('mainArtAlt')}
                        style={artImageStyle(MAIN_ART_BASE, art.scale)}
                    />
                </div>
            )}
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
