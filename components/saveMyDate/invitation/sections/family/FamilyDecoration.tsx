import { useTranslations } from 'next-intl';

import { type RenderContext, resolveImage, themeAssetName } from '@/lib/invitation/render';
import type { SectionDecoration } from '@/lib/invitation/sections';

type FamilyDecorationProps = {
    sectionId: string;
    decoration: SectionDecoration | undefined;
    ctx: RenderContext;
};

// A decorative element between a section's blocks, centred at its saved width. An admin's
// theme editor also shows which element it is, and the slot where there is none.
export function FamilyDecoration({ sectionId, decoration, ctx }: FamilyDecorationProps) {
    const t = useTranslations('InvitationRenderer');
    const src = resolveImage(decoration?.image, ctx);
    const slot = ctx.canvasTools?.decorationSlot?.(sectionId, decoration);
    if ((!decoration || !src) && !slot) return null;

    return (
        <div className="family-element-slot">
            {/* Element */}
            {decoration && src && (
                <div className="wedart-el-wrap" style={{ width: decoration.width }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={themeAssetName(decoration.image, ctx) ?? t('imageAlt')} />
                    {ctx.canvasTools?.decoration?.(sectionId, decoration)}
                </div>
            )}
            {/* Element picker (theme editor) */}
            {slot}
        </div>
    );
}
