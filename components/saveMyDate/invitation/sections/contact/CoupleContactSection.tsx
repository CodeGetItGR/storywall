import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { ContactIcons } from '@/components/saveMyDate/invitation/sections/contact/ContactIcons';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { contactVars } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type CoupleContactSection = Extract<InvitationSection, { type: 'coupleContact' }>;

type CoupleContactSectionProps = {
    section: CoupleContactSection;
    contrast: TextContrast;
    ctx: RenderContext;
};

// How to reach each of the couple, side by side on wide screens.
export function CoupleContactSection({ section, contrast, ctx }: CoupleContactSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            {/* Contact */}
            <div className="couple-contact-wrap" style={contactVars(data.iconStyle, ctx)}>
                <SectionText section={section} path="title" value={data.title} tag="h3" className="contact-title" contrast={contrast} ctx={ctx} />
                <div className="couple-contact-grid">
                    <ContactPerson section={section} partner="partnerA" contrast={contrast} ctx={ctx} />
                    <ContactPerson section={section} partner="partnerB" contrast={contrast} ctx={ctx} />
                </div>
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}

type ContactPersonProps = {
    section: CoupleContactSection;
    partner: 'partnerA' | 'partnerB';
    contrast: TextContrast;
    ctx: RenderContext;
};

function ContactPerson({ section, partner, contrast, ctx }: ContactPersonProps) {
    const person = section.data[partner];

    return (
        <div className="couple-contact-person">
            <SectionText
                section={section}
                path={`${partner}.name`}
                value={person.name}
                tag="h4"
                className="couple-contact-name"
                contrast={contrast}
                ctx={ctx}
            />
            <ContactIcons fields={person} labels={ctx.labels} />
        </div>
    );
}
