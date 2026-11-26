import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import { graduateHasContent, showsText, visibleItems } from '@/lib/invitation/listContent';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type GraduatesSectionProps = {
    section: Extract<InvitationSection, { type: 'graduates' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The graduates (KAN-302): the people grid of the godparents and sponsors, with each graduate's degree
// and university under the name.
export function GraduatesSection({ section, contrast, ctx }: GraduatesSectionProps) {
    return (
        <div className="section-inner">
            <div className="family-block family-godparents">
                {/* Title */}
                <SectionText
                    section={section}
                    path="title"
                    value={section.data.title}
                    tag="h3"
                    className="family-title"
                    contrast={contrast}
                    ctx={ctx}
                />
                {/* Graduates */}
                <div className="family-godparents-list">
                    {visibleItems(section.data.graduates, graduateHasContent, ctx).map((graduate) => {
                        const path = `graduates.${graduate.id}`;
                        return (
                            <div key={graduate.id} className="family-godparent">
                                <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`${path}.photo`} ctx={ctx} />
                                {showsText(graduate.name, ctx) && (
                                    <SectionText
                                        section={section}
                                        path={`${path}.name`}
                                        value={graduate.name}
                                        tag="h2"
                                        contrast={contrast}
                                        ctx={ctx}
                                    />
                                )}
                                {/* Degree and university */}
                                {showsText(graduate.degree, ctx) && (
                                    <SectionText
                                        section={section}
                                        path={`${path}.degree`}
                                        value={graduate.degree}
                                        tag="small"
                                        className="family-graduate-detail"
                                        contrast={contrast}
                                        ctx={ctx}
                                    />
                                )}
                                {showsText(graduate.university, ctx) && (
                                    <SectionText
                                        section={section}
                                        path={`${path}.university`}
                                        value={graduate.university}
                                        tag="small"
                                        className="family-graduate-detail"
                                        contrast={contrast}
                                        ctx={ctx}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
