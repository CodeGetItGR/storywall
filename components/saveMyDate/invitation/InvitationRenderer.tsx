import './invitation.css';

import { INVITATION_FONT_CLASSES } from '@/components/saveMyDate/invitation/invitationFonts';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { InvitationDocument } from '@/lib/invitation/document';
import { invitationLanguage } from '@/lib/invitation/labels';
import { buildRenderContext, type MediaResolver, themeCssVars, type TypographyPreset } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { type InvitationFontDto, uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

type InvitationRendererProps = {
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    // The typography preset the host picked, when there is one.
    hostPreset?: TypographyPreset;
    // The backend's font catalogue, for fonts uploaded in the admin.
    uploadedFonts?: InvitationFontDto[];
};

// The invitation as guests see it. The staging preview, the editor canvas and
// the published page all render through this.
export function InvitationRenderer({ document, theme, media, hostPreset, uploadedFonts = [] }: InvitationRendererProps) {
    const ctx = buildRenderContext(document, theme, media, hostPreset);
    const fontFaces = uploadedFontFaceCss(uploadedFonts, [document, theme, hostPreset]);

    return (
        <div lang={invitationLanguage(document)} className={`smd-invitation ${INVITATION_FONT_CLASSES}`} style={themeCssVars(ctx)}>
            {/* Uploaded fonts: built only from validated names and urls, so safe to inline */}
            {fontFaces && <style>{fontFaces}</style>}

            {/* Sections */}
            {document.sections.map((section, index) =>
                section.visible ? <InvitationSection key={section.id} section={section} index={index} ctx={ctx} /> : null,
            )}
        </div>
    );
}
