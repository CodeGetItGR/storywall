import type { ComponentType } from 'react';

import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { CapGraduate } from '@/components/saveMyDate/invitation/sections/family/graduates/CapGraduate';
import { CoverGraduate } from '@/components/saveMyDate/invitation/sections/family/graduates/CoverGraduate';
import type { GraduateProps } from '@/components/saveMyDate/invitation/sections/family/graduates/GraduateName';
import { PlacedStickers } from '@/components/saveMyDate/invitation/sections/family/graduates/PlacedStickers';
import { PlainGraduate } from '@/components/saveMyDate/invitation/sections/family/graduates/PlainGraduate';
import { PolaroidGraduate } from '@/components/saveMyDate/invitation/sections/family/graduates/PolaroidGraduate';
import { StickerGraduate } from '@/components/saveMyDate/invitation/sections/family/graduates/StickerGraduate';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import { graduatesStyleOf, TITLE_STICKERS } from '@/lib/invitation/graduatesStyles';
import { graduateHasContent, visibleItems } from '@/lib/invitation/listContent';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { GraduatesStyle, InvitationSection } from '@/lib/invitation/sections';

type GraduatesSectionProps = {
    section: Extract<InvitationSection, { type: 'graduates' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// One graduate in each of the block's looks.
const GRADUATE_BY_STYLE: Record<GraduatesStyle, ComponentType<GraduateProps>> = {
    plain: PlainGraduate,
    cap: CapGraduate,
    stickers: StickerGraduate,
    polaroids: PolaroidGraduate,
    cover: CoverGraduate,
};

// The graduates (KAN-302): the people grid of the godparents and sponsors, in the look the host picked.
export function GraduatesSection({ section, contrast, ctx }: GraduatesSectionProps) {
    const style = graduatesStyleOf(section.data);
    const GraduateItem = GRADUATE_BY_STYLE[style];

    return (
        <div className="section-inner">
            <div className={`family-block family-godparents graduates-block graduates-${style}`}>
                {/* Title */}
                <div className="grad-title">
                    <SectionText section={section} path="title" value={section.data.title} tag="h3" className="family-title" contrast={contrast} ctx={ctx} />
                    {style === 'stickers' && <PlacedStickers stickers={TITLE_STICKERS} labels={ctx.labels} />}
                </div>
                {/* Graduates */}
                <div className="family-godparents-list">
                    {visibleItems(section.data.graduates, graduateHasContent, ctx).map((graduate, index) => (
                        <GraduateItem key={graduate.id} section={section} graduate={graduate} index={index} contrast={contrast} ctx={ctx} />
                    ))}
                </div>
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
