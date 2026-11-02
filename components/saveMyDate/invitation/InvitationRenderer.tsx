import './invitation.css';

import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { InvitationDocument } from '@/lib/invitation/document';
import {
    buildRenderContext,
    googleFontsHref,
    type MediaResolver,
    themeCssVars,
    type TypographyPreset,
    usedFontFamilies,
} from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';

type InvitationRendererProps = {
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    // The typography preset the host picked, when there is one.
    hostPreset?: TypographyPreset;
};

// The invitation as guests see it. The staging preview, the editor canvas and
// the published page all render through this.
export function InvitationRenderer({ document, theme, media, hostPreset }: InvitationRendererProps) {
    const ctx = buildRenderContext(document, theme, media, hostPreset);
    const fontsHref = googleFontsHref(usedFontFamilies(document, ctx));

    return (
        <div className="smd-invitation" style={themeCssVars(ctx)}>
            {/* Fonts */}
            {fontsHref && <link rel="stylesheet" href={fontsHref} precedence="default" />}
            {/* Sections */}
            {document.sections.map((section, index) =>
                section.visible ? <InvitationSection key={section.id} section={section} index={index} ctx={ctx} /> : null,
            )}
        </div>
    );
}
