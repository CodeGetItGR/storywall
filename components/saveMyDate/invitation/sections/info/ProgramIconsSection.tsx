import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { ProgramRowIcon } from '@/components/saveMyDate/invitation/sections/info/ProgramRowIcon';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { programVars } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type ProgramIconsSectionProps = {
    section: Extract<InvitationSection, { type: 'programIcons' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

function edgeClass(index: number, count: number) {
    if (index === 0) return ' is-first';
    return index === count - 1 ? ' is-last' : '';
}

// The day's schedule with an icon for each moment.
export function ProgramIconsSection({ section, contrast, ctx }: ProgramIconsSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner program-icons-section">
            {/* Header */}
            <SectionText section={section} path="title" value={data.title} tag="h2" contrast={contrast} ctx={ctx} />
            <SectionText section={section} path="subtitle" value={data.subtitle} tag="p" className="program-icons-subtitle" contrast={contrast} ctx={ctx} />
            {/* Timeline */}
            <div className="program-icons-list" style={programVars(data.programStyle, contrast, ctx)}>
                {data.items.map((item, index) => (
                    <div key={item.id} className="program-icons-item">
                        <div className="program-icons-time">{item.time}</div>
                        <div className={`program-icons-node-cell${edgeClass(index, data.items.length)}`}>
                            <div className="program-icons-node">
                                <span className="program-icons-icon">
                                    <ProgramRowIcon icon={item.icon} label={item.label} ctx={ctx} />
                                </span>
                            </div>
                        </div>
                        <div className="program-icons-copy">
                            <div className="program-icons-label">{item.label}</div>
                            {item.description && <div className="program-icons-description">{item.description}</div>}
                        </div>
                    </div>
                ))}
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
