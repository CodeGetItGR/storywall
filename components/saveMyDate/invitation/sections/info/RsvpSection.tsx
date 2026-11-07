import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { RsvpForm } from '@/components/saveMyDate/invitation/sections/info/RsvpForm';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { rsvpVars } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type RsvpSectionProps = {
    section: Extract<InvitationSection, { type: 'rsvp' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The guest's reply, in the invitation's own look.
export function RsvpSection({ section, contrast, ctx }: RsvpSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            <div className="rsvp-form-wrap" style={rsvpVars(data, contrast, ctx)}>
                {/* Header */}
                <SectionText section={section} path="title" value={data.title} tag="h2" contrast={contrast} ctx={ctx} />
                <SectionText section={section} path="deadline" value={data.deadline} tag="p" contrast={contrast} ctx={ctx} />
                {/* Form */}
                <RsvpForm labels={ctx.labels} send={ctx.sendRsvp} />
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
