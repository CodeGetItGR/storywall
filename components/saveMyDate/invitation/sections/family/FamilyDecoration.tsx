import { useTranslations } from 'next-intl';

import { type RenderContext, resolveImage, themeAssetName } from '@/lib/invitation/render';
import type { SectionDecoration } from '@/lib/invitation/sections';

type FamilyDecorationProps = {
    sectionId: string;
    decoration: SectionDecoration | undefined;
    ctx: RenderContext;
};

// A decorative element between a section's blocks, centred at its saved width.
export function FamilyDecoration({ sectionId, decoration, ctx }: FamilyDecorationProps) {
    const t = useTranslations('InvitationRenderer');
    const src = resolveImage(decoration?.image, ctx);
    if (!decoration || !src) return null;

    return (
        <div className="family-element-slot">
            <div className="wedart-el-wrap" style={{ width: decoration.width }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={themeAssetName(decoration.image, ctx) ?? t('imageAlt')} />
                {ctx.canvasTools?.decoration?.(sectionId, decoration)}
            </div>
        </div>
    );
}
