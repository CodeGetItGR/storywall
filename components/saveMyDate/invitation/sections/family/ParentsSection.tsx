import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type ParentsSectionProps = {
    section: Extract<InvitationSection, { type: 'parents' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// Parents and godparents side by side, each under a fixed label.
export function ParentsSection({ section, contrast, ctx }: ParentsSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            <div className="parents-grid">
                {/* Parents */}
                <div className="person-item">
                    <small>{ctx.labels.parents}</small>
                    <br />
                    <SectionText section={section} path="parents" value={data.parents} tag="h3" contrast={contrast} ctx={ctx} />
                </div>
                {/* Godparents */}
                <div className="person-item">
                    <small>{ctx.labels.godparents}</small>
                    <br />
                    <SectionText section={section} path="godparents" value={data.godparents} tag="h3" contrast={contrast} ctx={ctx} />
                </div>
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
