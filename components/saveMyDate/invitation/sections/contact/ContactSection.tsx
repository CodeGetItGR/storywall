import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { ContactIcons } from '@/components/saveMyDate/invitation/sections/contact/ContactIcons';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { contactVars } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type ContactSectionProps = {
    section: Extract<InvitationSection, { type: 'contact' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

export function ContactSection({ section, contrast, ctx }: ContactSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            {/* Contact */}
            <div className="contact-wrap" style={contactVars(data.iconStyle, ctx)}>
                <SectionText section={section} path="title" value={data.title} tag="h3" className="contact-title" contrast={contrast} ctx={ctx} />
                <ContactIcons fields={data} labels={ctx.labels} />
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
