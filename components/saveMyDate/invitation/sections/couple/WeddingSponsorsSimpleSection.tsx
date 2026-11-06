import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { FamilyDecoration } from '@/components/saveMyDate/invitation/sections/family/FamilyDecoration';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type WeddingSponsorsSimpleSectionProps = {
    section: Extract<InvitationSection, { type: 'weddingSponsorsSimple' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// A title and the sponsors' names as one multi-line field.
export function WeddingSponsorsSimpleSection({ section, contrast, ctx }: WeddingSponsorsSimpleSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            {/* Sponsors */}
            <div className="family-block">
                <SectionText section={section} path="sponsorsTitle" value={data.sponsorsTitle} tag="h3" className="wedding-sponsors-simple-title" contrast={contrast} ctx={ctx} />
                <div className="wedding-sponsors-simple-list">
                    <SectionText section={section} path="sponsorsNames" value={data.sponsorsNames} tag="h2" className="wedding-sponsors-simple-name" contrast={contrast} ctx={ctx} />
                </div>
            </div>
            {/* Decoration */}
            <FamilyDecoration decoration={data.decoration} ctx={ctx} />
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
