import { useTranslations } from 'next-intl';

import { InvitationText } from '@/components/saveMyDate/invitation/InvitationText';
import { PhotoFrame } from '@/components/saveMyDate/invitation/sections/media/PhotoFrame';
import type { InvitationElement as Element } from '@/lib/invitation/elements';
import {
    elementTextRole,
    type RenderContext,
    resolveImage,
    type TextContrast,
    textStyleCss,
    themeAssetName,
} from '@/lib/invitation/render';

type InvitationElementProps = {
    element: Element;
    contrast: TextContrast;
    ctx: RenderContext;
};

// One element a host added under a section's own fields.
export function InvitationElement({ element, contrast, ctx }: InvitationElementProps) {
    const t = useTranslations('InvitationRenderer');

    switch (element.kind) {
        case 'text':
            return (
                <InvitationText
                    render={ctx.renderText}
                    target={{ kind: 'element', elementId: element.id }}
                    value={element.text}
                    tag="div"
                    className="text-block"
                    style={textStyleCss(element.style, { role: elementTextRole(element.role), contrast, defaultMarginTop: 18 }, ctx)}
                />
            );
        case 'spacer':
            return <div className="wedart-spacer" style={{ height: element.height }} />;
        case 'image': {
            const src = resolveImage(element.image, ctx);
            if (!src) return null;
            return (
                <div className="wedart-el-wrap" style={{ width: element.width }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={themeAssetName(element.image, ctx) ?? t('imageAlt')} />
                </div>
            );
        }
        case 'link':
            return (
                <div className="wedart-link-el">
                    <a className="theme-btn" href={element.url || '#'} target="_blank" rel="noopener">
                        {element.text || t('linkFallback')}
                    </a>
                </div>
            );
        case 'photoFrame':
            return <PhotoFrame element={element} ctx={ctx} />;
        // A column break is layout only.
        case 'columnBreak':
            return null;
    }
}
