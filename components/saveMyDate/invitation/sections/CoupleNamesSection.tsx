import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type CoupleNamesSectionProps = {
    section: Extract<InvitationSection, { type: 'coupleNames' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

export function CoupleNamesSection({ section, contrast, ctx }: CoupleNamesSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            {/* Names */}
            <div className="couple-names-block">
                <SectionText section={section} path="partnerAName" value={data.partnerAName} className="couple-name" contrast={contrast} ctx={ctx} />
                <div className="couple-names-amp">&amp;</div>
                <SectionText section={section} path="partnerBName" value={data.partnerBName} className="couple-name" contrast={contrast} ctx={ctx} />
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
