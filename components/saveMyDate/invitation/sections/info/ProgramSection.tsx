import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
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
            <div className="program-list" style={programVars(data.programStyle, contrast, ctx)}>
                {data.items.map((item, index) => (
                    <div key={item.id} className={`program-item ${index % 2 === 0 ? 'side-left' : 'side-right'}`}>
                        <div className="program-content">
                            <div className="program-time">{item.time}</div>
                            <div className="program-label">{item.label}</div>
                        </div>
                        <div className="program-dot" />
                    </div>
                ))}
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
