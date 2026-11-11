import './invitation.css';
import './effects/effects.css';

import { Fragment, type ReactNode } from 'react';

import { InvitationMotionRoot } from '@/components/saveMyDate/invitation/effects/InvitationMotionRoot';
import { INVITATION_FONT_CLASSES } from '@/components/saveMyDate/invitation/invitationFonts';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { CanvasTools } from '@/lib/invitation/canvasTools';
import type { InvitationDocument } from '@/lib/invitation/document';
import { invitationLanguage } from '@/lib/invitation/labels';
import { buildRenderContext, type MediaResolver, themeCssVars, type TypographyPreset } from '@/lib/invitation/render';
import type { RsvpSender } from '@/lib/invitation/rsvp';
import type { InvitationSection as Section } from '@/lib/invitation/sections';
import type { TextRenderer } from '@/lib/invitation/textEditing';
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
    // Sends a guest's RSVP reply; leave it out where nothing should be saved.
    sendRsvp?: RsvpSender;
    // The editor draws hidden sections too, so the host can show them again.
    showHidden?: boolean;
    // The editor puts its tools around each section.
    wrapSection?: (section: Section, index: number, content: ReactNode) => ReactNode;
    // The editor's drawing of each text, so it can be typed in place.
    renderText?: TextRenderer;
    // The editor's handles and arrows inside the invitation.
    canvasTools?: CanvasTools;
};

// The invitation as guests see it. The staging preview, the editor canvas and
// the published page all render through this.
export function InvitationRenderer({
    document,
    theme,
    media,
    hostPreset,
    uploadedFonts = [],
    sendRsvp,
    showHidden = false,
    wrapSection,
    renderText,
    canvasTools,
}: InvitationRendererProps) {
    const ctx = { ...buildRenderContext(document, theme, media, hostPreset, sendRsvp), renderText, canvasTools };
    const fontFaces = uploadedFontFaceCss(uploadedFonts, [document, theme, hostPreset]);

    return (
        <InvitationMotionRoot
            textAnimation={theme.textAnimation}
            lang={invitationLanguage(document)}
            className={`smd-invitation ${INVITATION_FONT_CLASSES}`}
            style={themeCssVars(ctx)}
        >
            {/* Uploaded fonts: built only from validated names and urls, so safe to inline */}
            {fontFaces && <style>{fontFaces}</style>}

            {/* Sections */}
            {document.sections.map((section, index) => {
                if (!section.visible && !showHidden) return null;
                const content = <InvitationSection key={section.id} section={section} index={index} ctx={ctx} />;
                return wrapSection ? <Fragment key={section.id}>{wrapSection(section, index, content)}</Fragment> : content;
            })}
        </InvitationMotionRoot>
    );
}
