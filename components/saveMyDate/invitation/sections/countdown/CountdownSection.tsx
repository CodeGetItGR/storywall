import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { CountdownNumbers } from '@/components/saveMyDate/invitation/sections/countdown/CountdownNumbers';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { countdownVars } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type CountdownSectionProps = {
    section: Extract<InvitationSection, { type: 'countdown' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// Days, hours, minutes and seconds until the date section's date.
export function CountdownSection({ section, contrast, ctx }: CountdownSectionProps) {
    return (
        <div className="section-inner">
            {/* Countdown */}
            <div className="wedart-countdown-wrap" style={countdownVars(section.data, contrast, ctx)}>
                <SectionText
                    section={section}
                    path="label"
                    value={section.data.label}
                    tag="p"
                    className="wedart-countdown-label"
                    contrast={contrast}
                    ctx={ctx}
                />
                <CountdownNumbers targetIso={ctx.eventIso} labels={ctx.labels} />
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
