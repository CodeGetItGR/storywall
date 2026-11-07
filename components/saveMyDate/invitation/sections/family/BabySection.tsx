import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type BabySectionProps = {
    section: Extract<InvitationSection, { type: 'baby' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The baby's photo, name and a short message.
export function BabySection({ section, contrast, ctx }: BabySectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            {/* Baby */}
            <div className="family-block family-baby">
                <FamilyPhoto photo={data.babyPhoto} name={data.babyName} ctx={ctx} />
                <SectionText section={section} path="babyName" value={data.babyName} tag="h2" contrast={contrast} ctx={ctx} />
                <SectionText section={section} path="babyMessage" value={data.babyMessage} tag="p" contrast={contrast} ctx={ctx} />
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
