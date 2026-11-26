import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { RsvpReply } from '@/components/saveMyDate/invitation/sections/info/RsvpReply';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { OPEN_RSVP } from '@/lib/invitation/rsvpSessions';
import { rsvpVars } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type RsvpSectionProps = {
    section: Extract<InvitationSection, { type: 'rsvp' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The guest's reply, in the invitation's own look: a compact block whose answers open the form in a pop-up (KAN-298),
// or a closed line once the reply-by date has passed (KAN-297).
export function RsvpSection({ section, contrast, ctx }: RsvpSectionProps) {
    const { data } = section;
    const rsvp = ctx.rsvp ?? OPEN_RSVP;

    return (
        <div className="section-inner">
            <div className="rsvp-form-wrap" style={rsvpVars(data, contrast, ctx)}>
                {/* Header */}
                <SectionText section={section} path="title" value={data.title} tag="h2" contrast={contrast} ctx={ctx} />
                <SectionText section={section} path="deadline" value={data.deadline} tag="p" contrast={contrast} ctx={ctx} />
                {/* Reply */}
                {rsvp.closed ? (
                    <p className="rsvp-closed">{ctx.labels.rsvpClosed}</p>
                ) : (
                    <RsvpReply title={data.title} labels={ctx.labels} send={ctx.sendRsvp} sessions={rsvp.sessions} />
                )}
                {/* Join: under the answers and their thank-you card alike */}
                {ctx.joinUrl && (
                    <a className="theme-btn rsvp-btn rsvp-join" href={ctx.joinUrl}>
                        {ctx.labels.joinEvent}
                    </a>
                )}
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
