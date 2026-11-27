import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { ProgramTimeline } from '@/components/saveMyDate/invitation/sections/info/ProgramTimeline';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { programVars } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type ProgramSectionProps = {
    section: Extract<InvitationSection, { type: 'program' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The day's schedule, alternating either side of a line.
export function ProgramSection({ section, contrast, ctx }: ProgramSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            {/* Title */}
            <SectionText section={section} path="title" value={data.title} tag="h2" contrast={contrast} ctx={ctx} />
            {/* Timeline */}
            <ProgramTimeline
                entries={data.items.map((item) => ({ id: item.id, time: item.time, label: item.label }))}
                style={programVars(data.programStyle, contrast, ctx)}
            />
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
