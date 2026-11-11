import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { FamilyDecoration } from '@/components/saveMyDate/invitation/sections/family/FamilyDecoration';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type ParentsSimpleSectionProps = {
    section: Extract<InvitationSection, { type: 'parentsSimple' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// Parents and godparents as plain names, with a decoration between them.
export function ParentsSimpleSection({ section, contrast, ctx }: ParentsSimpleSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            {/* Parents */}
            <div className="family-block">
                <SectionText section={section} path="parentsTitle" value={data.parentsTitle} tag="h3" className="family-title" contrast={contrast} ctx={ctx} />
                <SectionText section={section} path="parentAName" value={data.parentAName} tag="h2" contrast={contrast} ctx={ctx} />
                <SectionText section={section} path="parentBName" value={data.parentBName} tag="h2" contrast={contrast} ctx={ctx} />
            </div>
            {/* Decoration */}
            <FamilyDecoration sectionId={section.id} decoration={data.decoration} ctx={ctx} />
            {/* Godparents */}
            <div className="family-block">
                <SectionText section={section} path="godparentsTitle" value={data.godparentsTitle} tag="h3" className="family-title" contrast={contrast} ctx={ctx} />
                <div className="family-godparents-simple-list">
                    {data.godparents.map((godparent) => (
                        <div key={godparent.id} className="family-godparent-simple-item">
                            <SectionText section={section} path={`godparents.${godparent.id}.name`} value={godparent.name} tag="h2" contrast={contrast} ctx={ctx} />
                        </div>
                    ))}
                </div>
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
