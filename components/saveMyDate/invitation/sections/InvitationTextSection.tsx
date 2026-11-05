import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type InvitationTextSectionProps = {
    section: Extract<InvitationSection, { type: 'invitation' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The invitation wording, usually one of the ready-made texts.
export function InvitationTextSection({ section, contrast, ctx }: InvitationTextSectionProps) {
    return (
        <div className="section-inner">
            {/* Text */}
            <SectionText section={section} path="text" value={section.data.text} tag="p" className="invitation-text-lh" contrast={contrast} ctx={ctx} />
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
