import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type Section = Extract<InvitationSection, { type: 'parentsPhoto' }>;

type ParentsPhotoSectionProps = {
    section: Section;
    contrast: TextContrast;
    ctx: RenderContext;
};

// Two parents, each with a photo, a label and a name.
export function ParentsPhotoSection({ section, contrast, ctx }: ParentsPhotoSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            <div className="family-block family-parents">
                {/* Title */}
                <SectionText section={section} path="parentsTitle" value={data.parentsTitle} tag="h3" className="family-title" contrast={contrast} ctx={ctx} />
                {/* Parents */}
                <ParentPerson section={section} path="parentA" parent={data.parentA} contrast={contrast} ctx={ctx} />
                <ParentPerson section={section} path="parentB" parent={data.parentB} contrast={contrast} ctx={ctx} />
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}

type ParentPersonProps = {
    section: Section;
    path: 'parentA' | 'parentB';
    parent: Section['data']['parentA'];
    contrast: TextContrast;
    ctx: RenderContext;
};

function ParentPerson({ section, path, parent, contrast, ctx }: ParentPersonProps) {
    return (
        <div className="family-person">
            <FamilyPhoto photo={parent.photo} name={parent.name} ctx={ctx} />
            <SectionText section={section} path={`${path}.label`} value={parent.label} tag="small" className="family-person-label" contrast={contrast} ctx={ctx} />
            <SectionText section={section} path={`${path}.name`} value={parent.name} tag="h2" className="family-person-name" contrast={contrast} ctx={ctx} />
        </div>
    );
}
